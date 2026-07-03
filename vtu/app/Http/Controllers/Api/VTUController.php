<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\Wallet;
use App\Models\User;
use App\Models\SupplierWallet;
use App\Models\Transaction;
use App\Models\Commission;
use App\Services\PricingService;
use App\Services\PlatformService;
use App\Services\IDataService;

class VTUController extends Controller
{
    public function topup(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'phone' => 'required|string',
            'pay_from' => 'nullable|in:wallet,paystack',
            'agent_slug' => 'nullable|string'
        ]);

        $user = $request->user();
        $product = Product::findOrFail($data['product_id']);
        $supplierPrice = (float)$product->base_price;
        $displayPrice = PricingService::applyMarkup($supplierPrice);

        // Wallet balance check
        if ($data['pay_from'] === 'wallet') {
            $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);
            abort_if($wallet->balance < $displayPrice, 400, 'Insufficient wallet balance');
        }

        DB::beginTransaction();
        try {
            $response = app(IDataService::class)->placeProductOrder($product, $data['phone']);

            $body = $response->json();

            if (!$response->successful() || ($body['status'] ?? '') !== 'success') {
                throw new \Exception('Supplier topup failed: ' . json_encode($body));
            }

            $ref = (string) ($body['order_id'] ?? uniqid('idata_'));

            // Debit supplier wallet
            $supplierWallet = SupplierWallet::firstOrFail();
            abort_if($supplierWallet->balance < $supplierPrice, 500, 'Supplier wallet has insufficient funds');
            $supplierWallet->decrement('balance', $supplierPrice);

            // Debit user wallet
            if ($data['pay_from'] === 'wallet') {
                $wallet->decrement('balance', $displayPrice);
            }

            // Compute platform profit
            $profit = round($displayPrice - $supplierPrice, 2);
            if ($profit > 0) {
                PlatformService::addProfit($profit);
            }

            // Transaction
            $tx = Transaction::create([
                'user_id' => $user->id,
                'product_id' => $product->id,
                'reference' => $ref,
                'amount' => $displayPrice,
                'status' => 'success',
                'type' => 'vtu',
                'meta' => $body
            ]);

            // Agent commission
            if (!empty($data['agent_slug'])) {
                $agent = User::where('agent_slug', $data['agent_slug'])->where('role', 'agent')->first();
                if ($agent) {
                    $commissionAmt = PricingService::computeCommission($displayPrice);
                    $agentWallet = Wallet::firstOrCreate(['user_id' => $agent->id]);
                    $agentWallet->increment('balance', $commissionAmt);
                    Commission::create([
                        'agent_id' => $agent->id,
                        'transaction_id' => $tx->id,
                        'amount' => $commissionAmt
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Topup successful',
                'reference' => $ref,
                'data' => $body
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
            return response()->json([
                'message' => 'Topup failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

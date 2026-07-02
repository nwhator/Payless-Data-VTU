<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PaystackController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Product;
use App\Models\User;
use App\Models\Order;
use App\Services\TransactionService;

class PurchaseController extends Controller
{
    /**
     *  ADMIN PURCHASE
     * Admin manually initiates purchase for any customer or agent’s customer.
     */
    public function adminStore(Request $request)
    {
        $validated = $request->validate([
            'buyer_id'       => 'required|exists:users,id',
            'product_id'     => 'required|exists:products,id',
            'customer_phone' => 'required|string|max:20',
            'agent_id'       => 'nullable|exists:users,id',
        ]);

        $buyer   = User::findOrFail($validated['buyer_id']);
        $product = Product::findOrFail($validated['product_id']);
        $agent   = $validated['agent_id'] ? User::find($validated['agent_id']) : null;
        $payer   = $agent ?? $buyer;

        $costPrice = $product->api_price ?? $product->base_price ?? 0;
        $sellPrice = $agent
            ? ($product->agent_price ?? $product->customer_price)
            : ($buyer->role === 'admin'
                ? ($product->price ?? $product->customer_price)
                : ($product->customer_price ?? $product->price));

        $localReference = 'SMARTTOPUP_' . strtoupper(Str::random(10));

        if ($buyer->role !== 'admin' && $payer->wallet_balance < $sellPrice) {
            return response()->json(['status' => false, 'message' => 'Insufficient wallet balance.'], 400);
        }

        try {
            return DB::transaction(function () use ($buyer, $product, $validated, $payer, $sellPrice, $agent, $localReference) {
                if ($buyer->role !== 'admin') {
                    $payer->decrement('wallet_balance', $sellPrice);
                }

                //  Call DATAMART directly (admin flow bypasses Paystack)
                $res = Http::withHeaders([
                    'X-API-Key'    => config('services.datamart.key'),
                    'X-API-Secret' => config('services.datamart.secret'),
                    'Content-Type' => 'application/json',
                ])->post(config('services.datamart.base') . '/v1/purchase', [
                    'capacity'           => $product->capacity,
                    'product_name'       => $product->name,
                    'beneficiary_number' => $validated['customer_phone'],
                    'reference'          => $localReference,
                ]);

                $vendorResponse = $res->json();
                $vendorData = $vendorResponse['data'] ?? [];
                $status = $vendorData['status'] ?? 'pending';

                $order = Order::create([
                    'user_id'         => $buyer->id,
                    'agent_id'        => $agent?->id,
                    'network'         => $product->name,
                    'recipient'       => $validated['customer_phone'],
                    'data_volume'     => $product->capacity,
                    'amount'          => $sellPrice,
                    'currency'        => 'GHS',
                    'payment_status'  => 'successful',
                    'status'          => $status,
                    'reference'       => $localReference,
                    'vendor_response' => $vendorResponse,
                    'order_source'    => $agent ? 'agent_store' : 'admin_panel',
                    'ip_address'      => request()->ip(),
                    'user_agent'      => request()->userAgent(),
                ]);

                TransactionService::record(
                    $payer,
                    'debit',
                    $sellPrice,
                    "Data Purchase Initiated: {$product->name}",
                    $product->id,
                    ['vendor_ref' => $localReference, 'order_id' => $order->id]
                );

                if (!$res->successful() || !($vendorResponse['success'] ?? false)) {
                    if ($buyer->role !== 'admin') $payer->increment('wallet_balance', $sellPrice);
                    $order->update(['status' => 'failed']);
                    return response()->json(['status' => false, 'message' => 'Vendor purchase failed.'], 500);
                }

                return response()->json([
                    'status' => true,
                    'message' => 'Purchase initiated successfully.',
                    'reference' => $localReference,
                    'order' => $order,
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Admin Purchase Error', ['error' => $e->getMessage()]);
            return response()->json(['status' => false, 'message' => 'Error occurred.'], 500);
        }
    }

    /**
     *  SINGLE PURCHASE (Universal entry point)
     * Decides whether to call Paystack or Datamart directly.
     */
    public function purchaseSingle(Request $request)
    {
        $validated = $request->validate([
            'product_id'         => 'required|exists:products,id',
            'recipient_number' => 'required|string',
            'agent_id'           => 'nullable|exists:users,id',
            'store_id' => 'required|integer|exists:agent_stores,id',
            'email' => 'required|email',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $amount = $validated['amount'];

        $buyer = Auth::user(); // may be null if customer not logged in
        $product = Product::findOrFail($validated['product_id']);
        $agent = isset($validated['agent_id']) ? User::find($validated['agent_id']) : null;

        $localReference = 'SMARTTOPUP_' . strtoupper(Str::random(10));

        // 🧍 If visitor is NOT logged in (public buyer)
        if (!$buyer) {
            if (!$agent) {
                return response()->json(['success' => false, 'message' => 'Agent store not found.'], 400);
            }

            // Force Paystack since they’re not logged in
            $paystack = app(PaystackController::class);
            $initRequest = new Request([
                'email' => $request->input('email'), // collect from frontend form
                'amount' => $amount,
                'metadata' => [
                    'capacity' => $product->capacity,
                    'product_name' => $product->name,
                    'recipient_number' => $validated['recipient_number'],
                    'agent_id' => $agent->id,
                    'local_ref' => $localReference,
                ],
            ]);

            return $paystack->initialize($initRequest);
        }

        // 🧑‍💼 If agent or admin is logged in
        $payer = $buyer;
        $sellPrice = match ($buyer->role) {
            'admin' => $product->price ?? $product->customer_price,
            'agent' => $product->agent_price ?? $product->customer_price,
            default => $product->customer_price,
        };

        // Check wallet balance if not admin
        if ($buyer->role !== 'admin' && $payer->wallet_balance < $sellPrice) {
            return response()->json(['success' => false, 'message' => 'Insufficient wallet balance'], 400);
        }

        // Agent or admin direct Datamart purchase
        return $this->executeDatamartPurchase($buyer, $payer, $product, $validated, $agent, $sellPrice, $localReference);
    }


    /**
     *  Executes the Datamart API call and records everything.
     */
    protected function executeDatamartPurchase($buyer, $payer, $product, $validated, $agent, $sellPrice, $localReference)
    {
        try {
            return DB::transaction(function () use ($buyer, $payer, $product, $validated, $agent, $sellPrice, $localReference) {
                if ($buyer->role !== 'admin') $payer->decrement('wallet_balance', $sellPrice);

                $res = Http::withHeaders([
                    'X-API-Key'    => config('services.datamart.key'),
                    'X-API-Secret' => config('services.datamart.secret'),
                ])->post(config('services.datamart.base') . '/v1/purchase', [
                    'capacity'           => $product->capacity,
                    'product_name'       => $product->name,
                    'recipient_number' => $validated['recipient_number'],
                    'reference'          => $localReference,
                ]);

                $vendorResponse = $res->json();
                $status = $vendorResponse['data']['status'] ?? 'pending';

                $order = Order::create([
                    'user_id' => $buyer->id,
                    'agent_id' => $agent?->id,
                    'network' => $product->name,
                    'recipient' => $validated['recipient_number'],
                    'data_volume' => $product->capacity,
                    'amount' => $sellPrice,
                    'status' => $status,
                    'reference' => $localReference,
                    'vendor_response' => $vendorResponse,
                    'order_source' => $agent ? 'agent_store' : 'self',
                ]);

                TransactionService::record($payer, 'debit', $sellPrice, "Purchase: {$product->name}", $product->id, [
                    'order_id' => $order->id,
                    'vendor_ref' => $localReference,
                ]);

                if (!$res->successful() || !($vendorResponse['success'] ?? false)) {
                    if ($buyer->role !== 'admin') $payer->increment('wallet_balance', $sellPrice);
                    $order->update(['status' => 'failed']);
                    return response()->json(['success' => false, 'message' => 'Vendor failed.'], 500);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Purchase initiated successfully.',
                    'reference' => $localReference,
                    'order' => $order,
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Datamart Purchase Error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    /**
     *  Check transaction status by reference.
     */
    public function checkStatus($reference)
    {
        try {
            $res = Http::withHeaders([
                'X-API-Key'    => config('services.datamart.key'),
                'X-API-Secret' => config('services.datamart.secret'),
            ])->get(config('services.datamart.base') . '/v1/transactions/' . $reference);

            return response()->json($res->json(), $res->status());
        } catch (\Throwable $e) {
            Log::error('Transaction status check failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }
}

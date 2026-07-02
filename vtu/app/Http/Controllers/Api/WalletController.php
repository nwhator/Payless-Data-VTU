<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Wallet;
use App\Models\Transaction;

class WalletController extends Controller
{
    public function initializePaystack(Request $request)
    {
        $user = $request->user();
        $amount = (int) $request->amount * 100; // kobo

        $response = Http::withToken(env('PAYSTACK_SECRET_KEY'))
            ->post('https://api.paystack.co/transaction/initialize', [
                'email' => $user->email,
                'amount' => $amount,
                'callback_url' => url('/api/paystack/verify'),
            ]);

        return $response->json();
    }

    public function verifyPaystack(Request $request)
    {
        $reference = $request->reference;

        $verify = Http::withToken(env('PAYSTACK_SECRET_KEY'))
            ->get("https://api.paystack.co/transaction/verify/{$reference}")
            ->json();

        if ($verify['data']['status'] === 'success') {
            $user = auth()->user();
            $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);
            $wallet->increment('balance', $verify['data']['amount'] / 100);

            Transaction::create([
                'user_id' => $user->id,
                'reference' => $reference,
                'amount' => $verify['data']['amount'] / 100,
                'status' => 'success',
                'type' => 'funding',
            ]);
        }

        return response()->json($verify);
    }

    public function balance(Request $request)
    {
        $wallet = Wallet::firstOrCreate(['user_id' => $request->user()->id]);
        return response()->json(['balance' => $wallet->balance]);
    }
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VtuWebhookController extends Controller
{
    public function handle(Request $request)
    {
        try {
            $payload = $request->all();
            $signature = $request->header('X-Platform-Signature');
            $secret = config('services.datamart.secret');

            $computed = hash_hmac('sha256', json_encode($payload['data'] ?? []), $secret);

            if ($signature !== $computed) {
                Log::warning('Invalid webhook signature', ['payload' => $payload]);
                return response()->json(['success' => false, 'message' => 'Invalid signature'], 401);
            }

            Log::info('Webhook received', ['event' => $payload['event'], 'data' => $payload['data']]);

            // Here, you could update your transactions table if you store them locally

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            Log::error('Webhook error', ['message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }
}

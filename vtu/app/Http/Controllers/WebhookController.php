<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\OrderCompletedMail;

class WebhookController extends Controller
{
    public function handleVendorWebhook(Request $request)
    {
        // ✅ Log payload for debugging
        Log::info('Vendor webhook received', $request->all());

        // 🔐 Verify HMAC signature
        $signature = $request->header('X-Platform-Signature');
        $secret = config('services.datamart.secret'); // store this in config/services.php or .env

        if (!$this->verifySignature($request->input('data'), $signature, $secret)) {
            Log::warning('Invalid webhook signature');
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event = $request->input('event');
        $data = $request->input('data');

        // 🔹 Process transaction status updates
        if ($event === 'transaction.status_update') {
            $reference = $data['reference'] ?? null;
            $newStatus = strtolower($data['new_status'] ?? 'pending');

            if ($reference) {
                $order = Order::where('payment_reference', $reference)->first();

                if ($order) {
                    $previousStatus = $order->status;

                    $order->update([
                        'status' => $newStatus === 'successful' ? 'completed' : $newStatus,
                    ]);

                    Log::info("Order #{$order->id} status updated to {$order->status}");

                    // ✅ If order just became completed, notify admin
                    if ($order->status === 'completed' && $previousStatus !== 'completed') {
                        try {
                            Mail::to('admin@paylessdata.org')->queue(new OrderCompletedMail($order));
                            Log::info("Admin notified about completed order #{$order->id}");
                        } catch (\Exception $e) {
                            Log::error("Failed to send order completion email: " . $e->getMessage());
                        }
                    }
                } else {
                    Log::warning("Order not found for reference: {$reference}");
                }
            }
        }

        return response()->json(['received' => true]);
    }

    private function verifySignature($payload, $signature, $secret)
    {
        $computed = hash_hmac('sha256', json_encode($payload), $secret);
        return hash_equals($computed, $signature);
    }
}

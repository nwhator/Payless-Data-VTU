<?php

namespace App\Http\Controllers;

use App\Mail\OrderCompletedMail; // 1. Import the Mailable
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail; // 2. Import the Mail facade
use Illuminate\Http\JsonResponse;

class DatamartWebhookController extends Controller
{
    /**
     * Handles incoming webhooks from the Datamart vendor and sends admin notifications.
     * @param Request $request
     * @return JsonResponse
     */
    public function handle(Request $request): JsonResponse
    {
        // 1. Signature from header
        $receivedSig = $request->header('X-Platform-Signature');

        // 2. Secret
        $secret = config('services.datamart.secret');

        if (!$secret) {
            Log::critical('Datamart Secret Missing in config.');
            return response()->json(['success' => false], 500);
        }

        if (!$receivedSig) {
            Log::warning('Datamart Webhook: Missing signature.');
            return response()->json(['success' => false, 'message' => 'Missing signature'], 400);
        }

        // 3. Raw payload
        $raw = $request->all();

        // 4. Determine what Datamart actually signs (data payload)
        // Note: We use the array access method for hashing the 'data' payload 
        // to strictly match the vendor's signing process (as fixed previously).
        $dataToSign = $raw['data'] ?? $raw;

        // 5. JSON stringify EXACTLY as Datamart expects (canonical form)
        $payloadJson = json_encode($dataToSign, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        // 6. Compute signature
        $computedSig = hash_hmac('sha256', $payloadJson, $secret);

        // 7. Compare signatures safely
        if (!hash_equals($computedSig, $receivedSig)) {
            Log::warning('Datamart Signature mismatch (403).', [
                'received_sig'   => $receivedSig,
                'computed_sig'   => $computedSig,
                'payload_string' => $payloadJson
            ]);

            return response()->json(['success' => false, 'message' => 'Signature mismatch'], 403);
        }

        Log::info('Datamart Webhook verified.', $raw);

        // 8. Extract payload
        $dataPayload = $raw['data'] ?? $raw;

        $reference     = $dataPayload['reference'] ?? null;
        $vendorStatus  = $dataPayload['new_status'] ?? null;

        if (!$reference || !$vendorStatus) {
            Log::error('Datamart Webhook: Missing reference or status.', $dataPayload);
            return response()->json(['success' => false], 400);
        }

        // 9. Find the order
        $order = Order::where('reference', $reference)->first();

        if (!$order) {
            Log::warning('Datamart Webhook: Order not found.', ['reference' => $reference]);
            // Return 200 OK so the vendor doesn't retry this test/reference
            return response()->json(['success' => true, 'message' => 'Order ignored']);
        }

        // 10. Map vendor → local status
        $newStatus = match (strtolower($vendorStatus)) {
            'successful'          => 'completed',
            'failed', 'canceled'  => 'failed',
            default               => 'processing'
        };

        // 11. Update only if status changed
        if ($order->status !== $newStatus) {
            $order->update([
                'status' => $newStatus,
                'vendor_response' => array_merge(
                    $order->vendor_response ?? [],
                    ['datamart_webhook' => $raw]
                )
            ]);

            Log::info('Datamart Order updated.', [
                'order' => $order->id,
                'new_status' => $newStatus
            ]);
            
            // 12. NEW: Send Admin Email if the order is now complete
            if ($newStatus === 'completed') {
                try {
                    // Send the OrderCompletedMail to the admin email, queuing for performance
                    Mail::to('admin@paylessdata.net')->send(new OrderCompletedMail($order));
                    Log::info('Admin notification email queued for completed order.', ['order_id' => $order->id]);

                } catch (\Throwable $e) {
                    Log::error('Failed to queue Order Completed email to admin.', [
                        'order_id' => $order->id, 
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        return response()->json(['success' => true, 'message' => 'Processed']);
    }
}
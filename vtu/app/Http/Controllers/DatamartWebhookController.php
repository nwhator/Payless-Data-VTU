<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;

class DatamartWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        
        Log::info('Datamart Webhook: Received', [
            'event' => $payload['event'] ?? 'unknown',
            'reference' => $payload['data']['reference'] ?? 'N/A',
            'signature' => $request->header('X-Platform-Signature'),
        ]);

        if (!isset($payload['data'])) {
            return response()->json(['success' => false, 'message' => 'Invalid payload'], 400);
        }

        // Handle test webhooks
        if (($payload['event'] ?? '') === 'webhook.test') {
            return response()->json(['success' => true, 'message' => 'Test webhook received']);
        }

        $dataPayload = $payload['data'];
        $reference = $dataPayload['reference'] ?? null;
        $vendorStatus = $dataPayload['new_status'] ?? null;

        if (!$reference || !$vendorStatus) {
            return response()->json(['success' => true, 'message' => 'Event acknowledged']);
        }

        $order = Order::where('reference', $reference)->first();

        if (!$order) {
            Log::warning('Datamart Webhook: Order not found.', ['reference' => $reference]);
            return response()->json(['success' => true, 'message' => 'Order not found']);
        }

        // Skip if already in final state
        if (in_array($order->status, ['completed', 'failed'])) {
            return response()->json(['success' => true, 'message' => 'Already processed']);
        }

        try {
            $newStatus = match (strtolower($vendorStatus)) {
                'successful' => 'completed',
                'failed', 'canceled' => 'failed',
                default => 'processing',
            };

            $order->update([
                'status' => $newStatus,
                'vendor_response' => array_merge($order->vendor_response ?? [], ['webhook' => $payload]),
            ]);

            Log::info('Datamart Webhook: Order updated.', [
                'order_id' => $order->id,
                'reference' => $reference,
                'new_status' => $newStatus,
            ]);

        } catch (\Throwable $e) {
            Log::error('Datamart Webhook: Error.', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server Error'], 500);
        }

        return response()->json(['success' => true, 'message' => 'Processed']);
    }
}
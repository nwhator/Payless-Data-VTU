<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Product;
use App\Services\PaystackService;
use App\Services\PaystackFeeService;
use App\Services\TransactionService;
use App\Services\WalletService;
use App\Services\IDataService;
use App\Models\Transaction; 
use App\Models\Order; 
use Illuminate\Support\Facades\Http;

class AgentPurchaseController extends Controller
{
    /**
     * Initialize SINGLE agent purchase with wallet-first logic
     * Route: POST /agent/purchase/initialize
     */
    public function initializeSingle(
        Request $request,
        PaystackService $paystackService,
        PaystackFeeService $feeService,
        WalletService $walletService
    ): JsonResponse {
        /** @var \App\Models\User|null $agent */
        $agent = Auth::user();

        if (!$agent || $agent->role !== 'agent') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Agent access required.'
            ], 403);
        }

        // Validate request
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'beneficiary_number' => 'required|string',
            'reference' => 'nullable|string|max:255',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $amountCedis = (float) $product->agent_price;
        $balanceCedis = (float) $walletService->getBalance($agent);

        // Convert to pesewas for comparison
        $amountPesewas = (int) round($amountCedis * 100);
        $balancePesewas = (int) round($balanceCedis * 100);

        Log::info("Agent purchase wallet check", [
            'agent_id' => $agent->id,
            'wallet_balance_pesewas' => $balancePesewas,
            'required_amount_pesewas' => $amountPesewas,
            'sufficient_funds' => ($balancePesewas >= $amountPesewas) ? 'YES' : 'NO'
        ]);

        // =================================================================
        // WALLET-FIRST LOGIC (NO FEE)
        // =================================================================
        if ($balancePesewas >= $amountPesewas) {
            
            /** @var \App\Models\Transaction|null $transaction */
            $transaction = null;
            
            try {
                // 1. DEBIT WALLET (Creates transaction record)
                $transaction = $walletService->debit(
                    $agent,
                    $amountCedis,
                    "Wallet Purchase: {$product->name} to {$validated['beneficiary_number']}",
                    'purchase',
                    $product->id,
                    [
                        'beneficiary_number' => $validated['beneficiary_number'],
                        'reference' => $validated['reference'] ?? null,
                        'agent_id' => $agent->id,
                        'source_type' => 'agent_wallet_purchase',
                        'fee_applied' => false,
                        'fee_amount' => 0,
                    ]
                );

                // 2. FULFILL ORDER
                $order = $this->fulfillAgentOrder(
                    $transaction,
                    $agent,
                    $product,
                    $validated['beneficiary_number'],
                    $request->ip(),
                    $request->userAgent(),
                    $walletService
                );

                // 3. CHECK FULFILLMENT RESULT & REVERSE IF FAILED
                if (isset($order->vendor_error_message)) {
                    // 🛑 FULFILLMENT FAILED (vendor error)
                    
                    // 3A. IMMEDIATE REVERSAL/CREDIT
                    $walletService->credit(
                        $agent,
                        $amountCedis,
                        "REVERSAL: Fulfillment Failed - {$product->name} to {$validated['beneficiary_number']}",
                        'reversal', // Arg 4: string $type
                        [
                            'original_transaction_id' => $transaction->id,
                            'reason' => $order->vendor_error_message,
                        ], // Arg 5: array $meta
                        null, // Arg 6: ?int $sourceTransactionId
                        $product->id // Arg 7: ?int $productId (The last argument)
                    );

                    // 3B. UPDATE ORIGINAL TRANSACTION STATUS
                    TransactionService::update($transaction, [
                        'status' => 'reversed', 
                        'notes' => 'Reversed due to vendor fulfillment failure: ' . $order->vendor_error_message,
                    ]);

                    // 3C. RETURN USER-FRIENDLY FAILURE RESPONSE
                    return response()->json([
                        'success' => false,
                        'status' => 'wallet_fulfillment_reversed', // Specific status
                        'message' => $order->vendor_error_message, // <-- Vendor message
                        'transaction_id' => $transaction->id,
                        'order_id' => $order->id,
                    ], 400); // 400 Bad Request since the data (phone number) was invalid
                }

                // 4. FULFILLMENT SUCCESS 
                // Mark transaction as completed (assuming debit() created it as 'pending')
                TransactionService::update($transaction, [
                    'status' => 'completed',
                ]);

                return response()->json([
                    'success' => true,
                    'status' => 'wallet_success',
                    'message' => 'Purchase successful using wallet funds.',
                    'transaction_id' => $transaction->id,
                    'order_id' => $order->id,
                ]);

            } catch (\Throwable $e) {
                // 🛑 SYSTEM ERROR DURING FULFILLMENT OR DEBIT
                Log::error('Agent wallet purchase system failed, attempting reversal.', [
                    'error' => $e->getMessage(),
                    'agent_id' => $agent->id,
                    'transaction_id' => $transaction->id ?? 'N/A',
                ]);

                // Only attempt reversal if a transaction record was created
                if ($transaction) {
                    $walletService->credit(
                        $agent,
                        $amountCedis,
                        "REVERSAL: System Error - {$product->name} to {$validated['beneficiary_number']}",
                        'reversal', // Arg 4: string $type
                        ['original_transaction_id' => $transaction->id, 'reason' => 'System exception during fulfillment.'], // Arg 5: array $meta
                        null, // Arg 6: ?int $sourceTransactionId
                        $product->id // Arg 7: ?int $productId (The last argument)
                    );
                    
                    TransactionService::update($transaction, [
                        'status' => 'reversed',
                        'notes' => 'Reversed due to system exception during fulfillment.',
                    ]);
                }

                return response()->json([
                    'success' => false,
                    'status' => 'wallet_system_failure_reversed',
                    'message' => 'A critical error occurred. Funds have been automatically returned to your wallet. Please try again.',
                ], 500);
            }
        }

        // =================================================================
        // INSUFFICIENT FUNDS - PAYSTACK WITH FEE (No changes needed here)
        // =================================================================
        
        // Calculate fee breakdown
        $paymentBreakdown = $feeService->getPaymentBreakdown($amountCedis);
        $totalWithFee = $paymentBreakdown['total'];

        Log::info("Agent Paystack purchase with fee", [
            'agent_id' => $agent->id,
            'original_amount' => $paymentBreakdown['amount'],
            'fee_percentage' => $paymentBreakdown['percentage'],
            'fee_amount' => $paymentBreakdown['fee'],
            'total_amount' => $totalWithFee,
        ]);

        // Create transaction record with fee info
        $transaction = TransactionService::record(
            $agent,
            'payment',
            $amountCedis,
            "Agent Purchase: {$product->name} (Card)",
            $product->id,
            [
                'beneficiary_number' => $validated['beneficiary_number'],
                'reference' => $validated['reference'] ?? null,
                'agent_id' => $agent->id,
                'source_type' => 'agent_paystack_purchase',
                'fee_applied' => true,
                'fee_percentage' => $paymentBreakdown['percentage'],
                'fee_amount' => $paymentBreakdown['fee'],
                'total_with_fee' => $totalWithFee,
            ],
            'initialized',
            'GHS',
            null,
            $agent->email
        );

        $callbackUrl = route('agent.purchase.callback');

        try {
            // Initialize Paystack with TOTAL (including fee)
            $paystackResponse = $paystackService->initializeTransaction(
                $agent->email,
                $totalWithFee,
                [
                    'transaction_id' => $transaction->id,
                    'product_id' => $product->id,
                    'agent_id' => $agent->id,
                    'is_agent_purchase' => true,
                    'original_amount' => $amountCedis,
                    'fee_amount' => $paymentBreakdown['fee'],
                ],
                $callbackUrl
            );
        } catch (\Throwable $e) {
            Log::error('Agent Paystack initialization failed', [
                'error' => $e->getMessage(),
                'transaction_id' => $transaction->id
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Payment initialization failed.'
            ], 500);
        }

        // Update transaction with Paystack reference
        $paystackRef = $paystackResponse['data']['reference'] ?? null;
        TransactionService::update($transaction, [
            'paystack_ref' => $paystackRef,
            'status' => 'initialized',
        ]);

        return response()->json([
            'success' => true,
            'status' => 'paystack_initialized',
            'authorization_url' => $paystackResponse['data']['authorization_url'],
            'reference' => $paystackRef,
            'transaction_id' => $transaction->id,
            'payment_breakdown' => $paymentBreakdown,
            'message' => "Insufficient wallet balance. A {$paymentBreakdown['percentage']}% fee (₵{$paymentBreakdown['fee']}) will be added. Total: ₵{$totalWithFee}",
        ]);
    }

    /**
     * Initialize BULK agent purchase with wallet-first, Paystack fallback
     * Route: POST /agent/purchase/bulk
     */
    public function initializeBulk(
        Request $request,
        WalletService $walletService,
        PaystackService $paystackService,
        PaystackFeeService $feeService
    ): JsonResponse {
        /** @var \App\Models\User|null $agent */
        $agent = Auth::user();

        if (!$agent || $agent->role !== 'agent') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Agent access required.'
            ], 403);
        }

        // Validate request
        $validated = $request->validate([
            'orders' => 'required|array|min:1',
            'orders.*.product_id' => 'required|integer|exists:products,id',
            'orders.*.beneficiary_number' => 'required|string',
            'orders.*.reference' => 'nullable|string|max:255',
        ]);

        $ordersData = $validated['orders'];
        $totalCostCedis = 0.0;
        $orderProducts = [];

        // 1. Pre-validate products and calculate total cost
        foreach ($ordersData as $index => $orderData) {
            $product = Product::find($orderData['product_id']);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => "Product at index {$index} not found."
                ], 400);
            }
            $totalCostCedis += (float) $product->agent_price;
            $orderProducts[$index] = $product;
        }

        $balanceCedis = (float) $walletService->getBalance($agent);
        $totalCostPesewas = (int) round($totalCostCedis * 100);
        $balancePesewas = (int) round($balanceCedis * 100);

        Log::info("Agent bulk purchase wallet check", [
            'agent_id' => $agent->id,
            'wallet_balance_pesewas' => $balancePesewas,
            'required_total_pesewas' => $totalCostPesewas,
            'sufficient_funds' => ($balancePesewas >= $totalCostPesewas) ? 'YES' : 'NO'
        ]);

        // INSUFFICIENT FUNDS → Paystack fallback
        if ($balancePesewas < $totalCostPesewas) {
            $paymentBreakdown = $feeService->getPaymentBreakdown($totalCostCedis);
            $totalWithFee = $paymentBreakdown['total'];

            Log::info("Agent bulk purchase Paystack fallback with fee", [
                'agent_id' => $agent->id,
                'original_amount' => $paymentBreakdown['amount'],
                'fee_percentage' => $paymentBreakdown['percentage'],
                'fee_amount' => $paymentBreakdown['fee'],
                'total_amount' => $totalWithFee,
            ]);

            // Create a single transaction record for the entire bulk purchase
            $transaction = TransactionService::record(
                $agent,
                'payment',
                $totalCostCedis,
                "Agent Bulk Purchase (" . count($ordersData) . " items) (Card)",
                null,
                [
                    'is_bulk_purchase' => true,
                    'bulk_orders' => $ordersData,
                    'agent_id' => $agent->id,
                    'source_type' => 'agent_bulk_paystack_purchase',
                    'fee_applied' => true,
                    'fee_percentage' => $paymentBreakdown['percentage'],
                    'fee_amount' => $paymentBreakdown['fee'],
                    'total_with_fee' => $totalWithFee,
                ],
                'initialized',
                'GHS',
                null,
                $agent->email
            );

            $callbackUrl = route('agent.purchase.callback');

            try {
                $paystackResponse = $paystackService->initializeTransaction(
                    $agent->email,
                    $totalWithFee,
                    [
                        'transaction_id' => $transaction->id,
                        'agent_id' => $agent->id,
                        'is_bulk_purchase' => true,
                        'original_amount' => $totalCostCedis,
                        'fee_amount' => $paymentBreakdown['fee'],
                    ],
                    $callbackUrl
                );
            } catch (\Throwable $e) {
                Log::error('Agent bulk Paystack initialization failed', [
                    'error' => $e->getMessage(),
                    'transaction_id' => $transaction->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initialization failed.'
                ], 500);
            }

            $paystackRef = $paystackResponse['data']['reference'] ?? null;
            TransactionService::update($transaction, [
                'paystack_ref' => $paystackRef,
                'status' => 'initialized',
            ]);

            return response()->json([
                'success' => true,
                'status' => 'paystack_initialized',
                'authorization_url' => $paystackResponse['data']['authorization_url'],
                'message' => "Insufficient wallet balance. Redirecting to Paystack to pay GH₵ " . number_format($totalWithFee, 2) . " (includes " . $paymentBreakdown['percentage'] . "% processing fee).",
                'fee_breakdown' => $paymentBreakdown,
            ]);
        }

        $results = [
            'total' => count($ordersData),
            'succeeded' => 0,
            'failed' => 0,
            'details' => [],
        ];

        // 2. Process each order individually so partial success/failure is handled correctly
        foreach ($ordersData as $index => $orderData) {
            $product = $orderProducts[$index];
            $productPrice = (float) $product->agent_price;
            $beneficiary = $orderData['beneficiary_number'];
            $customRef = $orderData['reference'] ?? null;

            $transaction = null;

            try {
                // Debit wallet for this specific order
                $transaction = $walletService->debit(
                    $agent,
                    $productPrice,
                    "Bulk Purchase: {$product->name} to {$beneficiary}",
                    'purchase',
                    $product->id,
                    [
                        'beneficiary_number' => $beneficiary,
                        'reference' => $customRef,
                        'agent_id' => $agent->id,
                        'source_type' => 'agent_bulk_purchase',
                        'fee_applied' => false,
                        'fee_amount' => 0,
                    ]
                );

                // Fulfill order
                $order = $this->fulfillAgentOrder(
                    $transaction,
                    $agent,
                    $product,
                    $beneficiary,
                    $request->ip(),
                    $request->userAgent(),
                    $walletService
                );

                // Check fulfillment result
                if (isset($order->vendor_error_message)) {
                    // Reversal
                    $walletService->credit(
                        $agent,
                        $productPrice,
                        "REVERSAL: Bulk Fulfillment Failed - {$product->name} to {$beneficiary}",
                        'reversal',
                        [
                            'original_transaction_id' => $transaction->id,
                            'reason' => $order->vendor_error_message,
                        ],
                        null,
                        $product->id
                    );

                    TransactionService::update($transaction, [
                        'status' => 'reversed',
                        'notes' => 'Reversed due to bulk vendor failure: ' . $order->vendor_error_message,
                    ]);

                    $results['failed']++;
                    $results['details'][] = [
                        'recipient' => $beneficiary,
                        'product' => $product->name,
                        'status' => 'failed',
                        'message' => $order->vendor_error_message,
                    ];
                } else {
                    TransactionService::update($transaction, [
                        'status' => 'completed',
                    ]);

                    $results['succeeded']++;
                    $results['details'][] = [
                        'recipient' => $beneficiary,
                        'product' => $product->name,
                        'status' => 'completed',
                        'order_id' => $order->id,
                    ];
                }

            } catch (\Throwable $e) {
                Log::error("Bulk order index {$index} system failed", [
                    'error' => $e->getMessage(),
                    'agent_id' => $agent->id,
                ]);

                // Refund if transaction was debited
                if ($transaction) {
                    try {
                        $walletService->credit(
                            $agent,
                            $productPrice,
                            "REVERSAL: System Error - {$product->name} to {$beneficiary}",
                            'reversal',
                            ['original_transaction_id' => $transaction->id, 'reason' => 'System exception during bulk fulfillment.'],
                            null,
                            $product->id
                        );

                        TransactionService::update($transaction, [
                            'status' => 'reversed',
                            'notes' => 'Reversed due to system exception during bulk fulfillment.',
                        ]);
                    } catch (\Throwable $reversalEx) {
                        Log::critical("FAILED TO REVERSE BULK TRANSACTION - Manual recovery required", [
                            'transaction_id' => $transaction->id,
                            'error' => $reversalEx->getMessage()
                        ]);
                    }
                }

                $results['failed']++;
                $results['details'][] = [
                    'recipient' => $beneficiary,
                    'product' => $product->name,
                    'status' => 'failed',
                    'message' => 'System error occurred during order fulfillment.',
                ];
            }
        }

        $allFailed = ($results['failed'] === $results['total']);

        if ($allFailed) {
            return response()->json([
                'success' => false,
                'status' => 'bulk_failed',
                'message' => 'All bulk orders failed to fulfill. All funds have been returned to your wallet.',
                'results' => $results,
            ], 400);
        }

        $message = "Bulk purchase completed. Succeeded: {$results['succeeded']}, Failed: {$results['failed']}.";
        if ($results['failed'] > 0) {
            $message .= " Failed orders have been refunded to your wallet.";
        }

        return response()->json([
            'success' => true,
            'status' => 'bulk_success',
            'message' => $message,
            'results' => $results,
        ]);
    }

    /**
     * Handle Paystack callback for agent purchases (single AND bulk)
     * Route: GET /agent/purchase/callback
     */
    public function handleCallback(
        Request $request,
        PaystackService $paystackService,
        WalletService $walletService
    ) {
        $reference = $request->query('reference');

        if (!$reference) {
            Log::warning('Agent purchase callback: No reference provided');
            return redirect()->route('agent.dashboard')->with('error', 'Invalid payment reference.');
        }

        try {
            // Verify transaction with Paystack
            $verification = $paystackService->verifyTransaction($reference);

            if (!$verification || ($verification['data']['status'] ?? '') !== 'success') {
                Log::error('Agent purchase verification failed', ['reference' => $reference]);
                return redirect()->route('agent.dashboard')->with('error', 'Payment verification failed.');
            }

            $paystackData = $verification['data'];
            $metadata = $paystackData['metadata'] ?? [];
            $transactionId = $metadata['transaction_id'] ?? null;

            if (!$transactionId) {
                Log::error('No transaction ID in Paystack metadata', ['reference' => $reference]);
                return redirect()->route('agent.dashboard')->with('error', 'Transaction ID not found.');
            }

            // Find our local transaction
            $transaction = \App\Models\Transaction::find($transactionId);

            if (!$transaction) {
                Log::error('Transaction not found', ['transaction_id' => $transactionId]);
                return redirect()->route('agent.dashboard')->with('error', 'Transaction not found.');
            }

            // Check if already processed
            if ($transaction->status === 'completed') {
                return redirect()->route('agent.dashboard')->with('info', 'Transaction already processed.');
            }

            $agent = $transaction->user;

            // ============================
            // BULK PURCHASE CALLBACK
            // ============================
            $isBulk = $transaction->meta['is_bulk_purchase'] ?? false;

            if ($isBulk) {
                $bulkOrders = $transaction->meta['bulk_orders'] ?? [];

                if (empty($bulkOrders)) {
                    Log::error('Bulk purchase callback: No orders in meta', ['transaction_id' => $transaction->id]);
                    TransactionService::update($transaction, ['status' => 'failed']);
                    return redirect()->route('agent.dashboard')->with('error', 'Bulk order data missing.');
                }

                TransactionService::update($transaction, ['status' => 'completed']);

                $succeeded = 0;
                $failed = 0;
                $failedMessages = [];

                foreach ($bulkOrders as $orderData) {
                    $product = Product::find($orderData['product_id']);
                    if (!$product) {
                        $failed++;
                        $failedMessages[] = "Product #{$orderData['product_id']} not found";
                        continue;
                    }

                    $beneficiary = $orderData['beneficiary_number'];

                    try {
                        $order = $this->fulfillAgentOrder(
                            $transaction,
                            $agent,
                            $product,
                            $beneficiary,
                            $request->ip(),
                            $request->userAgent(),
                            $walletService
                        );

                        if (isset($order->vendor_error_message)) {
                            $failed++;
                            $failedMessages[] = "{$product->name} to {$beneficiary}: {$order->vendor_error_message}";
                        } else {
                            $succeeded++;
                        }
                    } catch (\Throwable $e) {
                        $failed++;
                        $failedMessages[] = "{$product->name} to {$beneficiary}: {$e->getMessage()}";
                        Log::error('Bulk order fulfillment exception', [
                            'product_id' => $product->id,
                            'beneficiary' => $beneficiary,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                $message = "Bulk purchase completed. Succeeded: {$succeeded}, Failed: {$failed}.";
                if ($failed > 0) {
                    $message .= " Some orders could not be fulfilled.";
                }

                $flashType = $failed === count($bulkOrders) ? 'error' : 'success';
                return redirect()->route('agent.dashboard')->with($flashType, $message);
            }

            // ============================
            // SINGLE PURCHASE CALLBACK
            // ============================
            $productId = $transaction->product_id;
            $product = Product::find($productId);

            if (!$product) {
                Log::error('Product not found', ['product_id' => $productId]);
                TransactionService::update($transaction, ['status' => 'failed']);
                return redirect()->route('agent.dashboard')->with('error', 'Product not found.');
            }

            // Get beneficiary number from metadata
            $beneficiaryNumber = $transaction->meta['beneficiary_number'] ?? null;

            if (!$beneficiaryNumber) {
                Log::error('No beneficiary number in transaction', ['transaction_id' => $transaction->id]);
                TransactionService::update($transaction, ['status' => 'failed']);
                return redirect()->route('agent.dashboard')->with('error', 'Beneficiary number missing.');
            }

            // Update transaction status
            TransactionService::update($transaction, ['status' => 'completed']);

            // Fulfill the order
            $order = $this->fulfillAgentOrder(
                $transaction,
                $agent,
                $product,
                $beneficiaryNumber,
                $request->ip(),
                $request->userAgent(),
                $walletService
            );
            
            // Check for vendor error message after fulfillment (for card purchases)
            if (isset($order->vendor_error_message)) {
                return redirect()->route('agent.dashboard')->with('error', 'Payment successful but fulfillment failed: ' . $order->vendor_error_message);
            }

            return redirect()->route('agent.dashboard')->with('success', 'Purchase completed successfully!');

        } catch (\Throwable $e) {
            Log::error('Agent purchase callback exception', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);
            return redirect()->route('agent.dashboard')->with('error', 'An error occurred processing your payment.');
        }
    }

    /**
     * Fulfill agent order (implement your order fulfillment logic)
     * This logic is reused from the PaystackController's fulfillOrder method.
     * @param Transaction $transaction
     * @param User $agent
     * @param Product $product
     * @param string $beneficiaryNumber
     * @param string|null $ipAddress
     * @param string|null $userAgent
     * @param WalletService $walletService // Unused in this specific logic but kept for consistency
     * @return Order
     * @throws \Exception
     */
    private function fulfillAgentOrder(
        $transaction, // Type-hint as Transaction
        $agent, // Type-hint as User
        $product, // Type-hint as Product
        string $beneficiaryNumber,
        ?string $ipAddress = null,
        ?string $userAgent = null,
		$walletService = null // Passed in the calling method, but not used here
    ): Order {
        // Determine the reference based on source (wallet uses internal ref, paystack uses paystack_ref)
        $reference = $transaction->paystack_ref ?? $transaction->reference;
        
        // Use the product's agent price for the order amount, 
        // because the transaction amount might be the total for a bulk purchase
        $amount = (float) $product->agent_price;
        
        $orderSource = $transaction->meta['source_type'] ?? 'agent_unknown';

        Log::info('Fulfilling agent order START', [
            'transaction_id' => $transaction->id,
            'agent_id' => $agent->id,
            'product_id' => $product->id,
            'beneficiary' => $beneficiaryNumber
        ]);

        // 1. Create Order Record
        $order = Order::create([
            'user_id'             => $agent->id, // Use agent ID as the buyer
            'agent_id'            => $agent->id, // Agent is the one fulfilling the order
            'network'             => $product->name,
            'recipient'           => $beneficiaryNumber,
            'data_volume'         => $product->capacity,
            'amount'              => $amount,
            'currency'            => 'GHS',
            'payment_status'      => 'success', // Payment is already confirmed (wallet debited or card verified)
            'status'              => 'pending', // Order status before vendor call
            'payment_reference'   => $reference,
            'reference'           => $reference,
            'transaction_id'      => $transaction->id,
            'order_source'        => $orderSource,
            'ip_address'          => $ipAddress,
            'user_agent'          => $userAgent,
        ]);

        // 2. Call iDATA Vendor API
        $idataService = app(IDataService::class);
        $res = $idataService->placeProductOrder($product, $beneficiaryNumber);

        $vendorResponse = $res->json();
        $success = $vendorResponse['success'] ?? ($res->successful() ? true : false); // Use top-level 'success' first, then HTTP status
        
        // Ensure success is a boolean for easier check
        $success = filter_var($success, FILTER_VALIDATE_BOOLEAN); 
        $finalStatus = 'failed';

        if ($success) {
            $finalStatus = $idataService->normalizeOrderStatus($vendorResponse['order_status'] ?? $vendorResponse['status'] ?? 'processing');
            
            // 3. Update order status + vendor response
            $order->update([
                'status' => $finalStatus,
                'vendor_response' => $vendorResponse,
            ]);

            Log::info('Agent Order fulfillment completed', [
                'order_id' => $order->id,
                'reference' => $reference,
                'source' => $orderSource,
                'vendor_status' => $finalStatus,
            ]);
        } else {
            // Handle vendor failure: update order status to failed
            $order->update([
                'status' => 'failed',
                'vendor_response' => $vendorResponse,
            ]);

            Log::error('Agent Order fulfillment FAILED', [
                'order_id' => $order->id,
                'reference' => $reference,
                'source' => $orderSource,
                'vendor_response' => $vendorResponse,
            ]);
            
            // We need to retrieve the user-facing message from the vendor response
            $vendorMessage = $vendorResponse['message'] ?? 'Order fulfillment failed due to an unknown vendor error.';
            
            // To pass the message up, we'll attach it to the temporary Order object for the return.
            $order->vendor_error_message = $vendorMessage;
        }
        
        return $order;
    }
}

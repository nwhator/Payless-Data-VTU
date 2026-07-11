<?php

namespace App\Http\Controllers;

use App\Services\PaystackService;
use App\Services\TransactionService;
use App\Models\AgentStore;
use App\Models\Product;
use App\Models\Order;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use App\Services\CommissionService;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use App\Services\PaystackFeeService;
use App\Services\IDataService;

class PaystackController extends Controller
{
    /**
     * Initialize a Paystack transaction
     */
    public function initialize(
        Request $request, 
        PaystackService $paystackService,
        PaystackFeeService $feeService
    ): JsonResponse {
        $validated = $request->validate([
            'email'             => 'required|email',
            'amount'            => 'required|numeric|min:1',
            'product_id'        => 'required|integer|exists:products,id',
            'store_id'          => 'required|integer|exists:agent_stores,id',
            'recipient_number'  => 'required|string',
        ]);
    
        $store = AgentStore::with('user')->findOrFail($validated['store_id']);
        $owner = $store->user;
        $product = Product::findOrFail($validated['product_id']);
    
        // Original amount from request
        $amountCedis = (float) $validated['amount'];
    
        // Calculate fee breakdown for Paystack payment
        $paymentBreakdown = $feeService->getPaymentBreakdown($amountCedis);
        $totalWithFee = $paymentBreakdown['total'];
    
        Log::info("Agent store Paystack payment initiated with fee", [
            'store_id' => $store->id,
            'store_name' => $store->store_name,
            'original_amount' => $paymentBreakdown['amount'],
            'fee_percentage' => $paymentBreakdown['percentage'],
            'fee_amount' => $paymentBreakdown['fee'],
            'total_amount' => $totalWithFee,
        ]);
    
        // 🧾 Create local transaction record with fee information
        $transaction = TransactionService::record(
            $owner,
            'payment',
            $amountCedis, // Original amount
            "Purchase of {$product->name} from {$store->store_name}",
            $product->id,
            [
                'recipient_number'   => $validated['recipient_number'],
                'store_id'           => $store->id,
                'store_name'         => $store->store_name,
                'store_owner_id'     => $owner->id ?? null,
                'store_owner_email'  => $owner->email ?? null,
                'fee_applied'        => true,
                'fee_percentage'     => $paymentBreakdown['percentage'],
                'fee_amount'         => $paymentBreakdown['fee'],
                'total_with_fee'     => $totalWithFee,
            ],
            'initialized',
            'GHS',
            null,
            $validated['email'] // customer's email
        );
    
        $purchaseCallbackUrl = "https://vtu.paylessdata.org/paystack/callback";
    
        try {
            // Initialize Paystack with TOTAL amount (including fee)
            $paystackResponse = $paystackService->initializeTransaction(
                $validated['email'],
                $totalWithFee, // ⚠️ IMPORTANT: Charge total including fee
                [
                    'transaction_id' => $transaction->id,
                    'store_id' => $store->id,
                    'product_id' => $product->id,
                    'is_agent_topup' => false,
                    'original_amount' => $amountCedis,
                    'fee_amount' => $paymentBreakdown['fee'],
                ],
                $purchaseCallbackUrl
            );
        } catch (\Throwable $e) {
            Log::error('Paystack initialize threw exception', [
                'transaction_id' => $transaction->id,
                'exception' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Payment initialization failed. Please try again.',
            ], 500);
        }
    
        if (empty($paystackResponse) || empty($paystackResponse['data']['authorization_url'] ?? null)) {
            Log::error('Failed Paystack initialization', [
                'transaction_id' => $transaction->id,
                'response' => $paystackResponse,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Payment initialization failed. Please try again.',
            ], 400);
        }
    
        $paystackRef = $paystackResponse['data']['reference'] ?? null;
        
        // Update transaction with Paystack reference
        TransactionService::update($transaction, [
            'paystack_ref' => $paystackRef,
            'status' => 'initialized',
        ]);
    
        return response()->json([
            'success' => true,
            'authorization_url' => $paystackResponse['data']['authorization_url'],
            'reference' => $paystackRef,
            'transaction_id' => $transaction->id,
            'payment_breakdown' => $paymentBreakdown, // Send breakdown to frontend
            'message' => "A {$paymentBreakdown['percentage']}% transaction fee (₵{$paymentBreakdown['fee']}) has been added. Total: ₵{$totalWithFee}",
        ]);
    }

   /**
     * Handle Paystack callback
     */

    
    public function callback(Request $request, PaystackService $paystackService)
    {
        $reference = $request->query('reference');

        if (!$reference) {
            return redirect()->route('home')->with('error', 'Missing payment reference.');
        }

        // 1. VERIFY PAYMENT WITH PAYSTACK
        $verification = $paystackService->verifyTransaction($reference);

        if (!$verification || empty($verification['data'])) {
            Log::error('Paystack verification failed', [
                'reference' => $reference,
                'response'  => $verification,
            ]);
            return redirect()->route('home')->with('error', 'Payment verification failed.');
        }

        $data   = $verification['data'];
        $status = $data['status'] ?? 'failed';

        // Paystack sends amount in kobo/pesewas → convert & round to 2 decimal places
        $amount = round(($data['amount'] ?? 0) / 100, 2);

        // 2. GET LOCAL TRANSACTION
        $transaction = Transaction::where('paystack_ref', $reference)->first();

        if (!$transaction) {
            Log::warning('Transaction not found for reference', ['reference' => $reference]);
            return redirect()->route('home')->with('error', 'Transaction not found.');
        }

        $meta       = $transaction->meta ?? [];
        $newStatus  = $status === 'success' ? 'success' : 'failed';

        // 3. ADMIN PROFIT CALCULATION
        $product = Product::find($transaction->product_id);

        $adminCostPrice = 0.00;
        $profitAmount   = 0.00; // This is the Admin's profit (Sale Price - Admin Cost)

        if ($product) {
            // Admin's fixed cost is the 'price' column in the products table
            $adminCostPrice = (float) $product->price;
            
            // Use bcsub for precise profit calculation: Total Revenue - Admin Cost
            $profitAmount   = (float) bcsub((string) $amount, (string) $adminCostPrice, 2);
        }

        // Update the transaction record with final status and Admin profit metrics
        TransactionService::update($transaction, [
            'type'          => 'purchase',
            'status'        => $newStatus,
            'amount'        => $amount,
            'cost_price'    => $adminCostPrice,
            'profit_amount' => $profitAmount,
        ]);

        // 4. STORE / AGENT RESOLUTION
        $storeSlug = 'data-store';
        $storeName = 'The Store';
        $agent     = null;

        if ($meta['store_id'] ?? false) {
            $store = AgentStore::with('user')->find($meta['store_id']);

            if ($store) {
                $storeSlug = $store->store_slug;
                $storeName = $store->store_name;
                $agent     = $store->user; // The agent (User model) who owns the commission
            }
        } elseif ($meta['store_name'] ?? false) {
            $storeName = $meta['store_name'];
        }

        // 5. SUCCESSFUL PAYMENT → COMMISSION + ORDER + VENDOR API
        if ($newStatus === 'success') {
            try {
                if (!$product) {
                    // Should theoretically not happen if $transaction exists, but safe guard is good
                    return redirect()
                        ->route('payment.failed')
                        ->with('error', 'Product details missing for purchase.')
                        ->with('store_slug', $storeSlug)
                        ->with('store_name', $storeName);
                }

                // -------- Commission Calculation (Uses added_amount)
                if ($agent) {
                    // The CommissionService calculates commission using AgentProductPrice.added_amount 
                    // and credits the agent's wallet balance using ->increment().
                    CommissionService::record($agent, $product, $amount, $reference);
                } else {
                    Log::warning('No agent found for successful transaction. Commission skipped.', [
                        'reference' => $reference,
                    ]);
                }

                // -------- Create Order
                $order = Order::create([
                    'user_id'           => $meta['store_owner_id'] ?? null,
                    'agent_id'          => $agent->id ?? null,
                    'store_id'          => $meta['store_id'] ?? null,
                    'network'           => $product->name,
                    'recipient'         => $meta['recipient_number'] ?? null,
                    'data_volume'       => $product->capacity,
                    'amount'            => $amount,
                    'currency'          => 'GHS',
                    'payment_status'    => 'success',
                    'status'            => 'pending',
                    'payment_reference' => $reference,
                    'reference'         => $reference,
                    'transaction_id'    => $transaction->id,
                    'order_source'      => $storeName ?? 'direct',
                    'ip_address'        => $request->ip(),
                    'user_agent'        => $request->userAgent(),
                ]);

                // -------- Call Vendor API (iDATA)
                $res = app(IDataService::class)->placeProductOrder($product, $meta['recipient_number'] ?? null);

                $vendorResponse = $res->json();
                $vendorStatus   = app(IDataService::class)->normalizeOrderStatus($vendorResponse['order_status'] ?? $vendorResponse['status'] ?? 'processing');

                // -------- Update Order
                $order->update([
                    'status'          => $vendorStatus,
                    'vendor_response' => $vendorResponse,
                ]);

                Log::info('iDATA purchase successful', [
                    'order_id'        => $order->id,
                    'reference'       => $reference,
                    'vendor_response' => $vendorResponse,
                ]);

                return redirect()
                    ->route('payment.success')
                    ->with('message', 'Payment verified and data purchase initiated. Commission credited.')
                    ->with('store_slug', $storeSlug)
                    ->with('store_name', $storeName);

            } catch (\Throwable $e) {

                Log::error('iDATA purchase failed during fulfillment', [
                    'reference' => $reference,
                    'error'     => $e->getMessage(),
                ]);

                return redirect()
                    ->route('payment.failed')
                    ->with('error', 'Payment verified, but data purchase failed due to internal error.')
                    ->with('store_slug', $storeSlug)
                    ->with('store_name', $storeName);
            }
        }

        // 6. FAILED PAYMENT
        return redirect()
            ->route('payment.failed')
            ->with('error', 'Payment was not successful or was canceled.')
            ->with('store_slug', $storeSlug)
            ->with('store_name', $storeName);
    }


    /**
     * Handles the purchase initiation: checks wallet first, then falls back to Paystack.
     * * @param Request $request
     * @param PaystackService $paystackService
     * @param WalletService $walletService // Dependency Injection for WalletService
     * @return JsonResponse
     */
   public function initializeMainPurchase(
        Request $request, 
        PaystackService $paystackService, 
        WalletService $walletService,
        PaystackFeeService $feeService
    ): JsonResponse {
        // 1. Validation
        $validated = $request->validate([
            'email'            => 'required|email',
            'amount'           => 'required|numeric|min:1',
            'product_id'       => 'required|integer|exists:products,id',
            'recipient_number' => ['required', 'string', 'regex:/^(0|(\+233))(2|5|30|31|32|33|34|35|36|37|38|39)\d{7,8}$/'],
            'user_id'          => 'required|integer|exists:users,id',
        ]);
    
        $owner = User::findOrFail($validated['user_id']);
        $product = Product::findOrFail($validated['product_id']);
        
        // Original amount from request
        $amountCedis = (float) $validated['amount'];
        $balanceCedis = (float) $walletService->getBalance($owner);
    
        // Convert to pesewas for comparison
        $amountPesewas  = (int) round($amountCedis * 100);
        $balancePesewas = (int) round($balanceCedis * 100);
    
        Log::info("Wallet Check for User {$owner->id}", [
            'wallet_balance_pesewas' => $balancePesewas,
            'required_amount_pesewas' => $amountPesewas,
            'sufficient_funds' => ($balancePesewas >= $amountPesewas) ? 'YES' : 'NO'
        ]);
    
        // =================================================================
        //  WALLET-FIRST LOGIC (NO FEE)
        // =================================================================
    
        if ($balancePesewas >= $amountPesewas) {
            try {
                $transaction = $walletService->debit(
                    $owner,
                    $amountCedis, 
                    "Wallet Purchase of {$product->name} to {$validated['recipient_number']}",
                    'purchase',
                    $product->id,
                    [
                        'recipient_number'  => $validated['recipient_number'],
                        'user_id'           => $owner->id,
                        'source_type'       => 'main_app_wallet',
                        'fee_applied'       => false,
                        'fee_amount'        => 0,
                    ]
                );
    
                $order = $this->fulfillOrder(
                    $transaction, 
                    $owner, 
                    $product, 
                    $validated['recipient_number'],
					$walletService,
                    $request->ip(),
                    $request->userAgent()
                );

                if ($order->status === 'failed') {
                    $vendorMessage = $order->vendor_response['message'] ?? 'Order fulfillment failed. Funds have been returned to your wallet.';
                    return response()->json([
                        'success' => false,
                        'status' => 'wallet_fulfillment_failed',
                        'message' => $vendorMessage,
                        'order_id' => $order->id,
                    ], 400);
                }

                return response()->json([
                    'success' => true,
                    'status' => 'wallet_success', 
                    'message' => 'Purchase successful using wallet funds.',
                    'transaction_id' => $transaction->id,
                    'order_id' => $order->id,
                ]);
    
            } catch (\Throwable $e) {
                Log::error('Wallet direct purchase failed', [
                    'error' => $e->getMessage(), 
                    'user_id' => $owner->id
                ]);
                
                return response()->json([
                    'success' => false,
                    'status' => 'wallet_failed',
                    'message' => 'Wallet debit failed. Please try again or use card.',
                    'error_details' => $e->getMessage(),
                ], 500);
            }
        }
    
        // =================================================================
        // OPTION B: INSUFFICIENT FUNDS - PAYSTACK WITH FEE
        // =================================================================
    
        // Calculate fee breakdown
        $paymentBreakdown = $feeService->getPaymentBreakdown($amountCedis);
        $totalWithFee = $paymentBreakdown['total'];
    
        Log::info("Paystack payment initiated with fee", [
            'user_id' => $owner->id,
            'original_amount' => $paymentBreakdown['amount'],
            'fee_percentage' => $paymentBreakdown['percentage'],
            'fee_amount' => $paymentBreakdown['fee'],
            'total_amount' => $totalWithFee,
        ]);
    
        // Create local Transaction Record with fee information
        $transaction = TransactionService::record(
            $owner,
            'payment',
            $amountCedis, // Original amount
            "Direct Customer Purchase of {$product->name} (Card)",
            $product->id,
            [
                'recipient_number'  => $validated['recipient_number'],
                'user_id'           => $owner->id,
                'source_type'       => 'main_app_direct',
                'fee_applied'       => true,
                'fee_percentage'    => $paymentBreakdown['percentage'],
                'fee_amount'        => $paymentBreakdown['fee'],
                'total_with_fee'    => $totalWithFee,
            ],
            'initialized',
            'GHS',
            null,
            $validated['email']
        );
    
        $purchaseCallbackUrl = "https://vtu.paylessdata.org/paystack/main-callback";
    
        try {
            // Initialize Paystack with TOTAL amount (including fee)
            $paystackResponse = $paystackService->initializeTransaction(
                $validated['email'],
                $totalWithFee, // IMPORTANT: Charge the total including fee
                [
                    'transaction_id' => $transaction->id,
                    'product_id' => $product->id,
                    'is_agent_topup' => false,
                    'user_id' => $owner->id,
                    'original_amount' => $amountCedis,
                    'fee_amount' => $paymentBreakdown['fee'],
                ],
                $purchaseCallbackUrl
            );
        } catch (\Throwable $e) {
            Log::error('Paystack initialization failed', [
                'error' => $e->getMessage(), 
                'transaction_id' => $transaction->id
            ]);
            return response()->json([
                'success' => false, 
                'message' => 'Payment initialization failed. Please try again.'
            ], 500);
        }
    
        // Update transaction with Paystack reference
        $paystackRef = $paystackResponse['data']['reference'] ?? null;
        TransactionService::update($transaction, [
            'paystack_ref' => $paystackRef,
            'status' => 'initialized',
        ]);
    
        // Return Paystack URL with fee breakdown
        return response()->json([
            'success' => true,
            'status' => 'paystack_initialized', 
            'authorization_url' => $paystackResponse['data']['authorization_url'],
            'reference' => $paystackRef,
            'transaction_id' => $transaction->id,
            'payment_breakdown' => $paymentBreakdown, // Send to frontend
            'message' => "Insufficient wallet balance. Redirecting to Paystack. A {$paymentBreakdown['percentage']}% fee (₵{$paymentBreakdown['fee']}) will be added."
        ]);
    }

   /**
     * Handles the Paystack callback after payment.
     * * @param Request $request
     * @param PaystackService $paystackService
     * @param WalletService $walletService
     * @return RedirectResponse
     */
    public function mainPurchaseCallback(Request $request, PaystackService $paystackService, WalletService $walletService): RedirectResponse
    {
        $reference = $request->query('reference');
    
        if (!$reference) {
            return redirect()->route('home')->with('error', 'Missing payment reference.');
        }
    
        // 1. Verify payment with Paystack
        $verification = $paystackService->verifyTransaction($reference);
    
        if (!$verification || empty($verification['data'])) {
            Log::error('Paystack main purchase verification failed', ['reference' => $reference, 'response' => $verification]);
            return redirect()->route('home')->with('error', 'Payment verification failed.');
        }
    
        $data = $verification['data'];
        $status = $data['status'] ?? 'failed';
        $amount = ($data['amount'] ?? 0) / 100;
    
        // 2. Find our local transaction
        $transaction = Transaction::where('paystack_ref', $reference)->first();
    
        if (!$transaction) {
            Log::warning('Main purchase transaction not found for reference', ['reference' => $reference]);
            return redirect()->route('home')->with('error', 'Transaction not found.');
        }
    
        $meta = $transaction->meta ?? [];
        $newStatus = $status === 'success' ? 'success' : 'failed';
    
        // Load the Product model and Customer User
        $product = Product::find($transaction->product_id);
        $userId = $meta['user_id'] ?? null;
        $customer = $userId ? User::find($userId) : null;
    
        $adminCostPrice = (float) ($product->price ?? 0.00);
        $profitAmount = $amount - $adminCostPrice;
    
        // 2.1. Update the transaction record
        TransactionService::update($transaction, [
            'type' => 'purchase',
            'status' => $newStatus,
            'amount' => $amount,
            'cost_price' => $adminCostPrice,
            'profit_amount' => $profitAmount,
        ]);
    
        // --- Purchase Details ---
        $recipientNumber = $meta['recipient_number'] ?? null;
        $greetingName = $customer->name ?? 'Customer';
        $productName = $product->name ?? 'Bundle';
    
        // 3. Process Successful Payment (Order Fulfillment)
        if ($newStatus === 'success') {
            try {
                if ($product && $customer && $recipientNumber) {
                    // 4. Call the reusable fulfillment method
                    $order = $this->fulfillOrder($transaction, $customer, $product, $recipientNumber, $walletService, $request->ip(), $request->userAgent());
    
                    return redirect()
                        ->route('customer.dashboard', [
                            'status' => 'success',
                            'message' => "Great news, {$greetingName}! Your purchase of {$productName} has been initiated. Check your dashboard for status updates.",
                        ]);
                }
    
                // Missing essential data
                Log::error('Direct purchase fulfillment failed due to missing metadata', ['reference' => $reference, 'meta' => $meta]);
                return redirect()
                    ->route('customer.dashboard', [
                        'status' => 'error',
                        'message' => 'Payment verified, but required data was missing. Please contact support immediately.',
                    ]);
    
            } catch (\Throwable $e) {
                Log::error('iDATA purchase failed during direct fulfillment', [
                    'reference' => $reference,
                    'error' => $e->getMessage(),
                ]);
    
                return redirect()
                    ->route('customer.dashboard', [
                        'status' => 'error',
                        'message' => 'Payment verified, but data purchase failed due to an internal error. Funds are safe; check your dashboard or contact support.',
                    ]);
            }
        }
    
        // 7. Payment Not Successful Redirect
        return redirect()
            ->route('customer.dashboard', [
                'status' => 'error',
                'message' => 'Payment was not successful or was canceled. You have not been charged.',
            ]);
    }

    /**
    * Reusable logic to create the order and call the iDATA Vendor API.
     * * @param Transaction $transaction
     * @param User $customer
     * @param Product $product
     * @param string $recipientNumber
     * @param string|null $ipAddress
     * @param string|null $userAgent
     * @return Order
     * @throws \Exception
     */
    private function fulfillOrder(
        Transaction $transaction, 
        User $customer, 
        Product $product, 
        string $recipientNumber,
		WalletService $walletService, // ADDED THIS PARAMETER
        ?string $ipAddress = null,
        ?string $userAgent = null   
    ): Order
    {
        // Determine the reference based on source
        $reference = $transaction->paystack_ref ?? $transaction->reference;
        $amount = (float) $transaction->amount;
        $orderSource = $transaction->meta['source_type'] ?? 'main_app_unknown';
        $isWalletPurchase = $orderSource === 'main_app_wallet';
    
        // 1. Create Order Record
        $order = Order::create([
            'user_id'           => $customer->id,
            'network'           => $product->name,
            'recipient'         => $recipientNumber,
            'data_volume'       => $product->capacity,
            'amount'            => $amount,
            'currency'          => 'GHS',
            'payment_status'    => 'success',
            'status'            => 'pending',
            'payment_reference' => $reference,
            'reference'         => $reference,
            'transaction_id'    => $transaction->id,
            'order_source'      => $orderSource,
            'ip_address'        => $ipAddress,
            'user_agent'        => $userAgent,
        ]);
    
        // 2. Call iDATA Vendor API
        $res = app(IDataService::class)->placeProductOrder($product, $recipientNumber);
    
        $vendorResponse = $res->json();
        
        // CORRECT: Check success at the root level, not nested under 'data'
        $vendorSuccess = $vendorResponse['success'] ?? false;
        $finalStatus = app(IDataService::class)->normalizeOrderStatus($vendorResponse['order_status'] ?? $vendorResponse['status'] ?? 'processing');
    
        // 3. Handle success vs failure
        if ($vendorSuccess === true) {
            // SUCCESS PATH
            $order->update([
                'status' => $finalStatus,
                'vendor_response' => $vendorResponse,
            ]);
    
            Log::info('Order fulfillment completed', [
                'order_id' => $order->id,
                'reference' => $reference,
                'source' => $orderSource,
                'vendor_status' => $finalStatus,
                'vendor_response' => $vendorResponse,
            ]);
        } else {
            // FAILURE PATH - Vendor API failed
            $order->update([
                'status' => 'failed',
                'vendor_response' => $vendorResponse,
            ]);
    
            Log::error('Order fulfillment FAILED - Vendor API error', [
                'order_id' => $order->id,
                'reference' => $reference,
                'source' => $orderSource,
                'vendor_response' => $vendorResponse,
            ]);
    
            // CRITICAL: Refund wallet if this was a wallet purchase
            if ($isWalletPurchase) {
                try {
                    $walletService->credit(
                        $customer,
                        $amount,
                        "Refund for failed order #{$order->id} - {$product->name}",
                        'refund',
                        [
                            'order_id' => $order->id,
						'product_id' => $product->id,
                            'original_reference' => $reference,
                            'reason' => 'vendor_api_failure',
                        ]
                    );
    
                    Log::info('Wallet refund successful', [
                        'order_id' => $order->id,
                        'user_id' => $customer->id,
                        'amount' => $amount,
                    ]);
                } catch (\Throwable $e) {
                    Log::critical('REFUND FAILED - Manual intervention required', [
                        'order_id' => $order->id,
                        'user_id' => $customer->id,
                        'amount' => $amount,
                        'error' => $e->getMessage(),
                    ]);
                    
                    // Consider sending alert to admin here
                }
            }
        }
        
        return $order;
    }
}

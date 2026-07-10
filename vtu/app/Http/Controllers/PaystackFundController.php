<?php

namespace App\Http\Controllers;

use App\Services\PaystackService;
use App\Services\TransactionService;
use App\Services\WalletService;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use App\Models\Transaction;
use Illuminate\Validation\ValidationException;

class PaystackFundController extends Controller
{
   protected $walletService;

    // Inject WalletService
    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Initialize a Paystack transaction for a Customer's Wallet Fund Top-up.
     * * @param Request $request
     * @param PaystackService $paystackService
     * @return JsonResponse
     */
    public function initializeCustomerFund(Request $request, PaystackService $paystackService): JsonResponse
    {
        // 1. Validation
        $validated = $request->validate([
            // Assuming user is authenticated, we validate the ID exists, 
            // but the authenticated user is preferred for secure context.
            'user_id' => 'required|integer|exists:users,id', 
            'email'  => 'required|email', 
            'amount' => 'required|numeric|min:10',
        ]);

        // FIX: Fetch the User object using the validated ID
        $customer = User::findOrFail($validated['user_id']);
        $amount = (float) $validated['amount'];

        // 2. Create local transaction record
        $transaction = TransactionService::record(
            $customer, 
            'top-up',
            $amount,
            "Customer wallet funding",
            null,
            [
                'is_customer_topup' => true,
                'user_id'           => $customer->id, // Use the user object's ID
            ],
            'initialized',
            'GHS',
            null,
            $validated['email']
        );

        // --- DEDICATED CALLBACK URL FOR CUSTOMERS ---
        $customerCallbackUrl = route('paystack.customer.fund.callback');
        // ------------------------------------------

        try {
            // 3. Initialize transaction with Paystack
            $paystackResponse = $paystackService->initializeTransaction(
                $validated['email'],
                $amount,
                [
                    'transaction_id'    => $transaction->id,
                    'is_customer_topup' => true, 
                ],
                $customerCallbackUrl 
            );
        } catch (\Throwable $e) {
            Log::error('Paystack customer fund initialize threw exception', [
                'transaction_id' => $transaction->id,
                'exception' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'message' => 'Payment initialization failed.'], 500);
        }

        // 4. Update transaction with Paystack reference
        $paystackRef = $paystackResponse['data']['reference'] ?? null;
        TransactionService::update($transaction, [
            'paystack_ref' => $paystackRef,
            'status' => 'initialized',
        ]);

        return response()->json([
            'success' => true,
            'authorization_url' => $paystackResponse['data']['authorization_url'],
            'reference' => $paystackRef,
        ]);
    }

    /**
     * Handles the Paystack callback redirect for customer wallet funding.
     * * @param Request $request
     * @param PaystackService $paystackService
     * @return RedirectResponse
     */
    public function customerFundCallback(Request $request, PaystackService $paystackService): RedirectResponse
    {
        // 1. Retrieve and verify transaction reference
        $reference = $request->query('reference');
        
        $verification = $paystackService->verifyTransaction($reference);
        $data = $verification['data'] ?? [];
        $status = $data['status'] ?? 'failed';
        $amount = ($data['amount'] ?? 0) / 100; // Convert kobo to GHS

        $transaction = Transaction::where('paystack_ref', $reference)->first();

        // If transaction record is missing (highly unlikely if initialization worked)
        if (!$transaction) {
            Log::warning('Customer Top-up transaction not found for reference', ['reference' => $reference]);
            $errorMessage = 'Transaction verification failed: Record not found.';
            return redirect()
                ->route('customer.dashboard', [
                    'status' => 'error',
                    'message' => urlencode($errorMessage)
                ]);
        }

        $meta = $transaction->meta ?? []; 
        $newStatus = $status === 'success' ? 'success' : 'failed';
        
        // Security check: Ensure this transaction belongs to the correct flow
        if (!($meta['is_customer_topup'] ?? false)) {
             Log::warning('Non-topup transaction hit customer callback.', ['reference' => $reference]);
             $errorMessage = 'Invalid transaction type for this callback.';
             return redirect()
                 ->route('customer.dashboard', [
                    'status' => 'error',
                    'message' => urlencode($errorMessage)
                 ]); 
        }

        // 2. Update local transaction status (record the actual funding amount, not including fee)
        $fundingAmount = $meta['original_amount'] ?? $amount;
        
        TransactionService::update($transaction, [
            'type' => 'top-up',
            'status' => $newStatus,
            'amount' => $fundingAmount,
        ]);

        // 3. Handle Success
        if ($newStatus === 'success') {
            $customer = User::find($meta['user_id'] ?? $transaction->user_id);
            
            if ($customer) {
                try {
                    // Use the WalletService for crediting
                    $this->walletService->credit($customer, $fundingAmount, 'Wallet Top-up via Paystack', $transaction->id);
                    Log::info("Customer Wallet Top-up Success: User {$customer->id} credited {$fundingAmount}");

                    $successMessage = "Wallet successfully funded with GHS {$fundingAmount}.";
                    return redirect()
                        ->route('customer.dashboard', [
                            'status' => 'success',
                            'message' => urlencode($successMessage)
                        ]);
                } catch (\Exception $e) {
                    Log::error("Wallet crediting failed for customer {$customer->id}", ['error' => $e->getMessage()]);
                    $errorMessage = 'Payment successful, but crediting wallet failed. Please contact support.';
                    // 🎯 FIX: Redirect with query parameters
                    return redirect()
                        ->route('customer.dashboard', [
                            'status' => 'error',
                            'message' => urlencode($errorMessage)
                        ]);
                }
            }
            
            Log::error('Top-up succeeded but customer not found for crediting.', ['reference' => $reference]);
            $errorMessage = 'Payment successful, but customer account was not found.';
            // 🎯 FIX: Redirect with query parameters
            return redirect()
                ->route('customer.dashboard', [
                    'status' => 'error',
                    'message' => urlencode($errorMessage)
                ]);
        } 
        
        // 4. Handle Failure (Transaction status is failed or verification failed)
        $failMessage = 'Payment was not successful or was canceled. Please try again.';
        // 🎯 FIX: Redirect with query parameters
        return redirect()
            ->route('customer.dashboard', [
                'status' => 'error',
                'message' => urlencode($failMessage)
            ]);
    }

    
}
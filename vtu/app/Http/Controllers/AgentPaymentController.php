<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AgentUpgrade; 
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Services\PaystackService;
use App\Services\TransactionService;
use App\Models\Transaction;
use App\Services\PaystackFeeService;

// NOTE: Set the base URL for redirects to work with your frontend handler
const DASHBOARD_URL = '/dashboard/upgrade'; 

class AgentPaymentController extends Controller
{
    /**
     * Initiates the Paystack transaction for the Agent upgrade fee.
     * @param Request $request
     * @param PaystackService $paystackService
     * @return JsonResponse
     */
    public function initializeCustomerUpgrade(
    Request $request, 
    PaystackService $paystackService,
    PaystackFeeService $feeService
): JsonResponse {
    // 1. Validation
    $validated = $request->validate([
        'user_id' => 'required|integer|exists:users,id', 
        'email'   => 'required|email', 
        'amount'  => 'required|numeric|min:1',
    ]);

    $customer = User::findOrFail($validated['user_id']);
    $amountCedis = (float) $validated['amount'];

    // Prevent users who are already agents
    if ($customer->role === 'agent') {
        return response()->json([
            'success' => false, 
            'message' => 'User is already an Agent.'
        ], 403);
    }

    // Calculate fee breakdown
    $paymentBreakdown = $feeService->getPaymentBreakdown($amountCedis);
    $totalWithFee = $paymentBreakdown['total'];

    Log::info("Customer upgrade to agent with fee", [
        'user_id' => $customer->id,
        'original_amount' => $paymentBreakdown['amount'],
        'fee_percentage' => $paymentBreakdown['percentage'],
        'fee_amount' => $paymentBreakdown['fee'],
        'total_amount' => $totalWithFee,
    ]);

    // Create AgentUpgrade Record
    try {
        $agentUpgrade = AgentUpgrade::create([
            'user_id' => $customer->id,
            'status' => 'awaiting_payment',
        ]);
    } catch (\Throwable $e) {
        Log::error('Failed to create AgentUpgrade record.', [
            'user_id' => $customer->id, 
            'exception' => $e->getMessage()
        ]);
        return response()->json([
            'success' => false, 
            'message' => 'System error creating upgrade record.'
        ], 500);
    }
    
    // 2. Create local transaction record with fee information
    $transaction = TransactionService::record(
        $customer, 
        'upgrade',
        $amountCedis, // Original amount
        "Agent account upgrade fee",
        null,
        [
            'is_agent_upgrade'  => true,
            'target_role'       => 'agent',
            'user_id'           => $customer->id,
            'agent_upgrade_id'  => $agentUpgrade->id,
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

    $upgradeCallbackUrl = route('paystack.customer.upgrade.callback');

    try {
        // 3. Initialize Paystack with TOTAL amount (including fee)
        $paystackResponse = $paystackService->initializeTransaction(
            $validated['email'],
            $totalWithFee, // IMPORTANT: Charge total including fee
            [
                'custom_fields' => [
                    [
                        'display_name' => 'Transaction ID',
                        'variable_name' => 'transaction_id',
                        'value' => $transaction->id
                    ],
                    [
                        'display_name' => 'Upgrade ID',
                        'variable_name' => 'agent_upgrade_id',
                        'value' => $agentUpgrade->id
                    ],
                    [
                        'display_name' => 'Original Amount',
                        'variable_name' => 'original_amount',
                        'value' => $amountCedis
                    ],
                    [
                        'display_name' => 'Fee Amount',
                        'variable_name' => 'fee_amount',
                        'value' => $paymentBreakdown['fee']
                    ]
                ]
            ],
            $upgradeCallbackUrl 
        );
    } catch (\Throwable $e) {
        Log::error('Paystack Agent upgrade initialize threw exception', [
            'transaction_id' => $transaction->id,
            'exception' => $e->getMessage(),
        ]);
        
        TransactionService::update($transaction, ['status' => 'failed']);
        
        $agentUpgrade->status = 'declined';
        $agentUpgrade->save(); 
        
        return response()->json([
            'success' => false, 
            'message' => 'Payment initialization failed. Please try again.'
        ], 500);
    }

    // 4. Update transaction and AgentUpgrade with Paystack reference
    $paystackRef = $paystackResponse['data']['reference'] ?? null;
    
    TransactionService::update($transaction, [
        'paystack_ref' => $paystackRef,
        'status' => 'initialized',
    ]);
    
    $agentUpgrade->payment_reference = $paystackRef;
    $agentUpgrade->save();

    return response()->json([
        'success' => true,
        'authorization_url' => $paystackResponse['data']['authorization_url'],
        'reference' => $paystackRef,
        'payment_breakdown' => $paymentBreakdown,
        'message' => "A {$paymentBreakdown['percentage']}% transaction fee (₵{$paymentBreakdown['fee']}) has been added. Total: ₵{$totalWithFee}",
    ]);
}

    // -----------------------------------------------------------------------

    /**
     * Handles the callback from Paystack after an Agent upgrade payment.
     * @param Request $request
     * @param PaystackService $paystackService
     * @return \Illuminate\Http\RedirectResponse
     */
    public function callbackCustomerUpgrade(
        Request $request, 
        PaystackService $paystackService
    ): \Illuminate\Http\RedirectResponse {
        $paystackRef = $request->query('reference');

        if (!$paystackRef) {
            $message = urlencode('Payment reference is missing in the callback. Cannot verify transaction.');
            return redirect(DASHBOARD_URL . "?status=error&message={$message}");
        }

        // 1. Verify transaction with Paystack
        try {
            $verification = $paystackService->verifyTransaction($paystackRef);
            
            // Extract the custom fields array for robust lookup
            $customFields = $verification['data']['metadata']['custom_fields'] ?? [];
            
            $localTransactionId = null;
            $agentUpgradeId = null;

            // Iterate through custom fields to extract IDs (FIXED LOGIC)
            foreach ($customFields as $field) {
                if (($field['variable_name'] ?? null) === 'transaction_id') {
                    $localTransactionId = $field['value'] ?? null;
                }
                if (($field['variable_name'] ?? null) === 'agent_upgrade_id') {
                    $agentUpgradeId = $field['value'] ?? null;
                }
            }

            Log::info('Paystack Verification Metadata Extraction', [
                'paystack_ref' => $paystackRef,
                'local_tx_id_extracted' => $localTransactionId,
                'agent_upgrade_id_extracted' => $agentUpgradeId,
            ]);

        } catch (\Throwable $e) {
            Log::error('Paystack verification failed for upgrade callback', ['reference' => $paystackRef, 'exception' => $e->getMessage()]);
            $message = urlencode('Payment verification failed due to a system error. Please contact support with reference: ' . $paystackRef);
            return redirect(DASHBOARD_URL . "?status=error&message={$message}");
        }

        $status = $verification['data']['status'] ?? 'failed';

        // --- Find local records (Primary Lookups - now reliable) ---
        $transaction = $localTransactionId ? Transaction::find($localTransactionId) : null;
        
        // Use the Paystack Ref, which was guaranteed to be saved on initialize
        $agentUpgrade = AgentUpgrade::where('payment_reference', $paystackRef)->first(); 

        // --- Handle missing records (CRITICAL PATH) ---
        if (!$transaction) {
             // Secondary lookup via paystack_ref if the metadata was somehow corrupted/missing
             $transaction = Transaction::where('paystack_ref', $paystackRef)->first();
             if (!$transaction) {
                // If we still can't find it, we must fail.
                Log::critical('Paystack upgrade callback received but transaction record is missing (primary/secondary lookup failed).', ['reference' => $paystackRef, 'local_tx_id' => $localTransactionId]);
                $message = urlencode('Transaction record missing. Please contact support immediately with your payment reference.');
                return redirect(DASHBOARD_URL . "?status=error&message={$message}");
             }
             // Found via secondary lookup, continue with the transaction object
        }

        // Ensure AgentUpgrade record is found (if not found via paystack_ref, try via transaction metadata)
        if (!$agentUpgrade) {
            $txMetadata = $transaction->meta ?? []; // Use 'meta' attribute which is an array/object
            $agentUpgradeId = $txMetadata['agent_upgrade_id'] ?? null;
            
            if ($agentUpgradeId) {
                $agentUpgrade = AgentUpgrade::find($agentUpgradeId);
            }

            if (!$agentUpgrade) {
                Log::critical('Paystack upgrade callback received but AgentUpgrade record is missing.', ['reference' => $paystackRef, 'transaction_id' => $transaction->id]);
                $message = urlencode('Upgrade record missing. Please contact support immediately with your payment reference.');
                return redirect(DASHBOARD_URL . "?status=error&message={$message}");
            }
        }
        // Records successfully found (end of the critical error path)

        // 2. Check if transaction was already processed
        if ($agentUpgrade->status === 'approved') {
             $message = urlencode('Your Agent upgrade was successful, and your account is already active!');
             return redirect(DASHBOARD_URL . "?status=success&message={$message}");
        }

        if ($agentUpgrade->status === 'pending') {
             $message = urlencode('Your payment has been verified and is awaiting admin approval.');
             return redirect(DASHBOARD_URL . "?status=success&message={$message}");
        }
        
        // 3. Process based on Paystack Status
        if ($status === 'success') {
            try {
                // Ensure atomic operation using a database transaction
                DB::transaction(function () use ($transaction, $verification, $agentUpgrade) {
                    // Payment is verified, but admin must still approve the role change.
                    TransactionService::update($transaction, [
                        'status'          => 'completed',
                        'paystack_data'   => json_encode($verification),
                        'paystack_amount' => $verification['data']['amount'] / 100,
                        'completed_at'    => now(),
                    ]);
                    
                    $agentUpgrade->status = 'pending';
                    $agentUpgrade->save();
                });

                // Success redirect with query parameters
                $message = urlencode('Payment verified successfully. Your Agent upgrade is now awaiting admin approval.');
                return redirect(DASHBOARD_URL . "?status=success&message={$message}");

            } catch (\Throwable $e) {
                // Critical failure during DB transaction (rollback happens here)
                Log::error('CRITICAL: Agent upgrade role change or DB update failed.', ['transaction_id' => $transaction->id, 'exception' => $e->getMessage()]);
                
                // Update local records to reflect the error
                TransactionService::update($transaction, ['status' => 'error']);
                $agentUpgrade->status = 'declined'; 
                $agentUpgrade->save();
                
                $message = urlencode('A critical error occurred during the upgrade. Please contact support immediately with your payment reference: ' . $paystackRef);
                return redirect(DASHBOARD_URL . "?status=error&message={$message}");
            }
        } else {
            // Status is 'failed', 'abandoned', etc.
            TransactionService::update($transaction, [
                'status'        => $status,
                'paystack_data' => json_encode($verification),
            ]);
            
            // Update AgentUpgrade status to 'declined'
            $agentUpgrade->status = 'declined';
            $agentUpgrade->save();

            // Failure redirect with query parameters
            $message = urlencode('Payment failed or was cancelled. Please try again to complete your Agent upgrade.');
            return redirect(DASHBOARD_URL . "?status=error&message={$message}");
        }
    }
}

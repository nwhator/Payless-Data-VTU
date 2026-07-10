<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Services\PaystackService;
use App\Services\TransactionService;
use App\Models\User;
use App\Services\PaystackFeeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class PaystackAgentsController extends Controller
{
    /**
     * Initialize a Paystack transaction for an Agent's Wallet Fund Top-up.
     */
    public function initializeFund(
    Request $request, 
    PaystackService $paystackService,
    PaystackFeeService $feeService
): JsonResponse {
    $agent = Auth::user(); 

    $validated = $request->validate([
        'email'  => 'required|email', 
        'amount' => 'required|numeric|min:10',
    ]);
    
    $amountCedis = (float) $validated['amount'];

    // Calculate fee breakdown
    $paymentBreakdown = $feeService->getPaymentBreakdown($amountCedis);
    $totalWithFee = $paymentBreakdown['total'];

    Log::info("Agent wallet funding with fee", [
        'agent_id' => $agent->id,
        'original_amount' => $paymentBreakdown['amount'],
        'fee_percentage' => $paymentBreakdown['percentage'],
        'fee_amount' => $paymentBreakdown['fee'],
        'total_amount' => $totalWithFee,
    ]);

    // 1. Create local transaction record with fee information
    $transaction = TransactionService::record(
        $agent, 
        'top-up',
        $amountCedis, // Original amount
        "Agent wallet funding",
        null,
        [
            'is_agent_topup' => true,
            'agent_id'       => $agent->id,
            'fee_applied'    => true,
            'fee_percentage' => $paymentBreakdown['percentage'],
            'fee_amount'     => $paymentBreakdown['fee'],
            'total_with_fee' => $totalWithFee,
        ],
        'initialized',
        'GHS',
        null,
        $validated['email']
    );

    $agentCallbackUrl = route('paystack.agent.callback');

    try {
        // 2. Initialize Paystack with TOTAL amount (including fee)
        $paystackResponse = $paystackService->initializeTransaction(
            $validated['email'],
            $totalWithFee, // IMPORTANT: Charge total including fee
            [
                'transaction_id' => $transaction->id,
                'is_agent_topup' => true,
                'original_amount' => $amountCedis,
                'fee_amount' => $paymentBreakdown['fee'],
            ],
            $agentCallbackUrl 
        );
    } catch (\Throwable $e) {
        Log::error('Paystack agent fund initialize threw exception', [
            'transaction_id' => $transaction->id,
            'exception' => $e->getMessage(),
        ]);
        return response()->json([
            'success' => false, 
            'message' => 'Payment initialization failed.'
        ], 500);
    }

    if (empty($paystackResponse['data']['authorization_url'])) {
         Log::error('Paystack init failed: No auth URL.', ['response' => $paystackResponse]);
         return response()->json([
             'success' => false, 
             'message' => 'Paystack did not return an authorization URL.'
         ], 500);
    }

    // 3. Update transaction with Paystack reference
    $paystackRef = $paystackResponse['data']['reference'] ?? null;
    TransactionService::update($transaction, [
        'paystack_ref' => $paystackRef,
        'status' => 'initialized',
    ]);

    return response()->json([
        'success' => true,
        'authorization_url' => $paystackResponse['data']['authorization_url'],
        'reference' => $paystackRef,
        'payment_breakdown' => $paymentBreakdown,
        'message' => "A {$paymentBreakdown['percentage']}% transaction fee (₵{$paymentBreakdown['fee']}) has been added. Total: ₵{$totalWithFee}",
    ]);
}

    /**
     * Handle Paystack callback for Agent Top-ups.
     */
    public function callback(Request $request, PaystackService $paystackService)
    {
        // 1. Retrieve and verify transaction reference
        $reference = $request->query('reference');

        if (!$reference) {
            return redirect()->route('agent.dashboard')->with('error', 'Missing payment reference in callback.');
        }

        $verification = $paystackService->verifyTransaction($reference);
        $data = $verification['data'] ?? [];
        $status = $data['status'] ?? 'failed';
        $amount = ($data['amount'] ?? 0) / 100; // Convert to base currency (GHS)

        // 2. Find our local transaction
        // NOTE: This assumes TransactionService::findByReference is available or is a wrapper for Transaction::where
        $transaction = TransactionService::findByReference($reference);

        if (!$transaction) {
            Log::warning('Top-up transaction not found for reference', ['reference' => $reference]);
            return redirect()->route('agent.dashboard')->with('error', 'Transaction not found.');
        }

        $meta = $transaction->meta ?? []; 
        $newStatus = $status === 'success' ? 'success' : 'failed';
        
        // Ensure this is truly a top-up meant for this controller
        if (!($meta['is_agent_topup'] ?? false)) {
             Log::warning('Non-topup transaction hit agent callback.', ['reference' => $reference]);
             // Redirect it somewhere safe if it's the wrong type of transaction
             return redirect()->route('home')->with('error', 'Invalid transaction type for this callback.'); 
        }

        // 3. Update local transaction status (record the actual funding amount, not including fee)
        $fundingAmount = $meta['original_amount'] ?? $amount;
        
        TransactionService::update($transaction, [
            'type' => 'top-up',
            'status' => $newStatus,
            'amount' => $fundingAmount,
        ]);

        // 4. Handle Success
        if ($newStatus === 'success') {
            // Retrieve the agent using the saved metadata or transaction user_id
            $agent = User::find($meta['agent_id'] ?? $transaction->user_id);
            
            if ($agent) {
                // Perform the wallet update inside a transaction for safety
                DB::transaction(function () use ($agent, $fundingAmount) {
                    $wallet = $agent->wallet()->first();
                    if ($wallet) {
                        $wallet->increment('balance', $fundingAmount);
                        Log::info("Agent Wallet Top-up Success: Agent {$agent->id} credited {$fundingAmount}");
                    } else {
                        Log::error("Wallet object missing during agent top-up for agent {$agent->id}");
                    }
                });

                // Correctly redirects back to the *authenticated agent's* dashboard
                return redirect()->route('agent.dashboard')->with('success', "Wallet successfully funded with GHS {$fundingAmount}.");
            }
            
            Log::error('Top-up succeeded but agent not found for crediting.', ['reference' => $reference]);
            return redirect()->route('agent.dashboard')->with('error', 'Payment successful, but agent was not credited.');
        } 
        
        // 5. Handle Failure
        return redirect()
            ->route('agent.dashboard')
            ->with('error', 'Payment was not successful or was canceled. Please try again.');
    }
}
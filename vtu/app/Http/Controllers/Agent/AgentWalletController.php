<?php

// app/Http/Controllers/Agent/AgentWalletController.php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\WithdrawalRequest;
use App\Models\Commission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class AgentWalletController extends Controller
{
    /**
     * Fetches the agent's current wallet statistics.
     */
    public function getStats()
    {
        $agent = Auth::user();
        
        $wallet = $agent->wallet()->first(['balance', 'total_commissions']);

        if (!$wallet) {
            return response()->json([
                'error' => 'Wallet not found for this agent.'
            ], 404);
        }

        $pendingWithdrawals = WithdrawalRequest::where('user_id', $agent->id)
            ->where('status', WithdrawalRequest::STATUS_PENDING)
            ->sum('amount');

        $approvedWithdrawals = WithdrawalRequest::where('user_id', $agent->id)
            ->where('status', WithdrawalRequest::STATUS_APPROVED)
            ->sum('amount');

        return response()->json([
            'current_balance' => (float) $wallet->balance,
            'total_commissions' => (float) $wallet->total_commissions,
            'pending_withdrawals' => (float) $pendingWithdrawals,
            'approved_withdrawals' => (float) $approvedWithdrawals,
        ]);
    }

    /**
     * Fetches the agent's withdrawal history.
     */
    public function getWithdrawalHistory()
    {
        $history = WithdrawalRequest::where('user_id', Auth::id())
            ->latest()
            ->get();
            
        return response()->json([
            'data' => $history
        ]);
    }
    
    /**
     * Fetches the agent's commission earnings history.
     */
    public function getCommissionHistory()
    {
        $commissions = Commission::where('user_id', Auth::id())
            ->latest()
            ->get([
                'id', 
                'created_at', 
                'product_id', 
                'sale_reference', 
                'sell_price', 
                'cost_price', 
                'profit', 
                'status'
            ]);
            
        return response()->json([
            'data' => $commissions
        ]);
    }

    /**
     * Submits a new withdrawal request.
     */
    public function submitWithdrawalRequest(Request $request)
    {
        $agent = Auth::user();

        $validated = $request->validate([
            'amount' => 'required|numeric|min:20', 
            'processor' => 'required|string|max:20',
            'account_details' => 'required|string|max:255',
        ]);

        $amount = (float) $validated['amount'];

        try {
            return DB::transaction(function () use ($agent, $amount, $validated) {
                $wallet = $agent->wallet;

                if (!$wallet || $wallet->total_commissions < $amount) {
                    throw ValidationException::withMessages([
                        'amount' => ['Insufficient commission balance.'],
                    ]);
                }

                $withdrawalRequest = WithdrawalRequest::create([
                    'user_id' => $agent->id,
                    'wallet_id' => $wallet->id,
                    'amount' => $amount,
                    'payout_method' => $validated['processor'],
                    'account_details' => $validated['account_details'],
                    'status' => WithdrawalRequest::STATUS_PENDING,
                ]);

                $wallet->decrement('total_commissions', $amount);

                return response()->json([
                    'message' => 'Withdrawal request submitted successfully and is awaiting admin approval.',
                    'request' => $withdrawalRequest,
                ], 201);
            });

        } catch (ValidationException $e) {
            return response()->json([
                'error' => 'Validation Failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error("Withdrawal submission failed for Agent {$agent->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to process request. Please try again later.'
            ], 500);
        }
    }

    /**
     * Agent triggers Paystack payout for an approved withdrawal request.
     * 
     * Flow: Admin approved → Agent clicks "Withdraw Now" → This method → Paystack credits agent.
     */
    public function processPayout(Request $request, $id)
    {
        $agent = Auth::user();

        $wr = WithdrawalRequest::where('id', $id)
            ->where('user_id', $agent->id)
            ->lockForUpdate()
            ->firstOrFail();

        if ($wr->status !== WithdrawalRequest::STATUS_APPROVED) {
            return response()->json([
                'error' => 'This withdrawal request has not been approved yet or has already been processed.'
            ], 400);
        }

        $secretKey = config('paystack.secret_key');
        if (!$secretKey) {
            return response()->json([
                'error' => 'Paystack is not configured. Please contact admin for manual payout.'
            ], 500);
        }

        try {
            $accountParts = array_map('trim', explode('|', $wr->account_details ?? ''));
            $name = $accountParts[0] ?? $agent->name;
            $accountNumber = $accountParts[1] ?? '';
            $bankName = $accountParts[2] ?? '';

            if (!$accountNumber) {
                return response()->json([
                    'error' => 'Invalid account details. Please contact admin.'
                ], 400);
            }

            $bankCode = null;
            if ($wr->payout_method === 'bank') {
                $bankCode = $this->getBankCode($bankName);
                if (!$bankCode) {
                    return response()->json([
                        'error' => "Bank '{$bankName}' not recognized. Please contact admin."
                    ], 400);
                }
            }

            // 1. Create transfer recipient
            $recipientPayload = [
                'type' => $bankCode ? 'nuban' : 'mobile_money',
                'name' => $name,
                'account_number' => $accountNumber,
                'currency' => 'GHS',
            ];

            if ($bankCode) {
                $recipientPayload['bank_code'] = $bankCode;
            } else {
                // Mobile money — use default provider code
                $recipientPayload['bank_code'] = 'MTN';
            }

            $baseUrl = config('paystack.payment_url', 'https://api.paystack.co');

            $recipientRes = Http::withToken($secretKey)
                ->post($baseUrl . '/transferrecipient', $recipientPayload);

            if (!$recipientRes->successful()) {
                Log::error("Payout #{$wr->id}: Failed to create Paystack recipient.", [
                    'status' => $recipientRes->status(),
                    'body' => $recipientRes->json(),
                ]);
                return response()->json([
                    'error' => 'Failed to create transfer recipient. Please try again.',
                    'details' => $recipientRes->json('message'),
                ], 500);
            }

            $recipientCode = $recipientRes->json('data.recipient_code');
            if (!$recipientCode) {
                return response()->json([
                    'error' => 'Invalid recipient response from Paystack.'
                ], 500);
            }

            // 2. Initiate transfer
            $transferPayload = [
                'source' => 'balance',
                'amount' => (int) ($wr->amount * 100), // Paystack uses pesewas
                'recipient' => $recipientCode,
                'reason' => "Withdrawal #{$wr->id} - {$name}",
                'currency' => 'GHS',
            ];

            $transferRes = Http::withToken($secretKey)
                ->post($baseUrl . '/transfer', $transferPayload);

            if ($transferRes->successful()) {
                $wr->update([
                    'status' => WithdrawalRequest::STATUS_COMPLETED,
                    'completed_at' => now(),
                ]);

                Log::info("Payout #{$wr->id}: Paystack transfer successful.", [
                    'transfer_code' => $transferRes->json('data.transfer_code'),
                ]);

                return response()->json([
                    'message' => 'Withdrawal processed successfully! Funds have been sent to your account.',
                ]);
            }

            Log::error("Payout #{$wr->id}: Paystack transfer failed.", [
                'status' => $transferRes->status(),
                'body' => $transferRes->json(),
            ]);

            return response()->json([
                'error' => 'Transfer failed: ' . ($transferRes->json('message') ?? 'Unknown error'),
            ], 500);

        } catch (\Exception $e) {
            Log::error("Payout #{$wr->id}: Exception: " . $e->getMessage());
            return response()->json([
                'error' => 'An error occurred while processing your withdrawal. Please try again.'
            ], 500);
        }
    }

    /**
     * Map bank name to Paystack bank code for Ghana.
     */
    private function getBankCode(string $bankName): ?string
    {
        $banks = [
            'gcb' => 'GCB',
            'ecobank' => 'EBG',
            'stanbic' => 'SBL',
            'standard chartered' => 'SCB',
            'absa' => 'ABG',
            'barclays' => 'ABG',
            'fidelity' => 'FBL',
            'cal bank' => 'CAL',
            'cal' => 'CAL',
            'unibank' => 'UMB',
            'first atlantic' => 'FAB',
            'societe generale' => 'SOGEGH',
            'energy bank' => 'ENB',
            'prudential' => 'PRU',
            'republic bank' => 'RBGH',
            'zenith' => 'ZNB',
            'gtbank' => 'GTB',
            'gt bank' => 'GTB',
            'access bank' => 'ABL',
            'uba' => 'UBA',
        ];

        $lower = strtolower(trim($bankName));
        foreach ($banks as $key => $code) {
            if (str_contains($lower, $key)) {
                return $code;
            }
        }

        return null;
    }
}

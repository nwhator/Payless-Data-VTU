<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WithdrawalRequest;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WithdrawalRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = WithdrawalRequest::with(['user', 'wallet', 'processor'])->latest();

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function approve(Request $request, $id)
    {
        $wr = WithdrawalRequest::with('wallet')->lockForUpdate()->findOrFail($id);

        if ($wr->status !== WithdrawalRequest::STATUS_PENDING) {
            return response()->json(['error' => 'Already processed'], 400);
        }

        $paystackResult = null;

        DB::transaction(function () use ($wr, &$paystackResult) {
            $wallet = $wr->wallet ?? ($wr->user ? $wr->user->wallet : null);

            $wr->update([
                'status' => WithdrawalRequest::STATUS_COMPLETED,
                'processed_by' => Auth::id(),
                'completed_at' => now(),
            ]);

            if ($wallet) {
                WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'admin_id' => Auth::id(),
                    'type' => 'debit',
                    'amount' => $wr->amount,
                    'reason' => 'Withdrawal completed - #' . $wr->id,
                    'withdrawal_request_id' => $wr->id,
                ]);
            }

            // Attempt Paystack auto-payout
            $paystackResult = $this->attemptPaystackPayout($wr);
        });

        $message = 'Withdrawal completed';
        if ($paystackResult === true) {
            $message .= '. Paystack transfer initiated successfully.';
        } elseif ($paystackResult === false) {
            $message .= '. Paystack transfer failed — manual payout required.';
        } else {
            $message .= '. Paystack not configured — manual payout required.';
        }

        return response()->json(['message' => $message]);
    }

    public function decline(Request $request, $id)
    {
        $request->validate(['decline_reason' => 'required|string|max:500']);

        $wr = WithdrawalRequest::findOrFail($id);

        if ($wr->status !== WithdrawalRequest::STATUS_PENDING) {
            return response()->json(['error' => 'Already processed'], 400);
        }

        DB::transaction(function () use ($wr, $request) {
            $wr->update([
                'status' => WithdrawalRequest::STATUS_DECLINED,
                'decline_reason' => $request->decline_reason,
                'processed_by' => Auth::id(),
            ]);

            $user = $wr->user;
            $wallet = $wr->wallet ?? ($user ? $user->wallet : null);
            if ($wallet) {
                $wallet->increment('total_commissions', $wr->amount);
            }
        });

        return response()->json(['message' => 'Withdrawal declined']);
    }

    /**
     * Attempt to pay the agent via Paystack Transfer API.
     *
     * Steps:
     * 1. Create a transfer recipient (bank account or mobile money)
     * 2. Initiate the transfer
     *
     * Returns true on success, false on failure, null if Paystack not configured.
     */
    private function attemptPaystackPayout(WithdrawalRequest $wr): ?bool
    {
        $secretKey = config('paystack.secret_key');
        if (!$secretKey) {
            return null;
        }

        try {
            $accountDetails = $wr->account_details ?? '';
            $parts = array_map('trim', explode('|', $accountDetails));

            $name = $parts[0] ?? $wr->user?->name ?? 'Agent';
            $accountNumber = $parts[1] ?? '';
            $bankName = $parts[2] ?? '';

            if (!$accountNumber) {
                Log::warning("Withdrawal #{$wr->id}: No account number found for Paystack payout.");
                return false;
            }

            // Map bank names to Paystack bank codes (Ghana banks)
            $bankCode = $this->getBankCode($bankName, $wr->payout_method);

            // Create transfer recipient
            $recipientPayload = [
                'type' => $bankCode ? 'nuban' : 'mobile_money',
                'name' => $name,
                'account_number' => $accountNumber,
                'bank_code' => $bankCode ?: 'MTN', // fallback
                'currency' => 'GHS',
            ];

            $recipientRes = Http::withToken($secretKey)
                ->post(config('paystack.payment_url') . '/transferrecipient', $recipientPayload);

            if (!$recipientRes->successful()) {
                Log::error("Withdrawal #{$wr->id}: Failed to create Paystack recipient.", [
                    'response' => $recipientRes->json(),
                ]);
                return false;
            }

            $recipientCode = $recipientRes->json('data.recipient_code');
            if (!$recipientCode) {
                return false;
            }

            // Initiate transfer
            $transferPayload = [
                'source' => 'balance',
                'amount' => (int) ($wr->amount * 100), // Paystack uses kobo/pesewas
                'recipient' => $recipientCode,
                'reason' => "Withdrawal request #{$wr->id}",
                'currency' => 'GHS',
            ];

            $transferRes = Http::withToken($secretKey)
                ->post(config('paystack.payment_url') . '/transfer', $transferPayload);

            if ($transferRes->successful()) {
                Log::info("Withdrawal #{$wr->id}: Paystack transfer initiated.", [
                    'transfer_code' => $transferRes->json('data.transfer_code'),
                ]);
                return true;
            }

            Log::error("Withdrawal #{$wr->id}: Paystack transfer failed.", [
                'response' => $transferRes->json(),
            ]);
            return false;

        } catch (\Exception $e) {
            Log::error("Withdrawal #{$wr->id}: Paystack payout error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Map bank name to Paystack bank code for Ghana.
     */
    private function getBankCode(string $bankName, string $payoutMethod): ?string
    {
        if ($payoutMethod === 'momo') {
            return null; // mobile money uses different flow
        }

        $banks = [
            'gcb' => 'GCB',
            'ecobank' => 'EBG',
            'stanbic' => 'SBL',
            'standard chartered' => 'SCB',
            'absa' => 'ABG',
            'barclays' => 'ABG',
            'fidelity' => 'FBL',
            'cal bank' => 'CAL',
            'unibank' => 'UMB',
            'first atlantic' => 'FAB',
            'societe generale' => 'SOGEGH',
            'energy bank' => 'ENB',
            'atlas miles' => 'AMB',
            'sahel sahara' => 'SGS',
            'prudential' => 'PRU',
            ' republic bank' => 'RBGH',
            'sopped' => 'SPB',
            'universal investment' => 'UIB',
            'zenith' => 'ZNB',
            'gtbank' => 'GTB',
            'gt bank' => 'GTB',
            'access bank' => 'ABL',
            'uba' => 'UBA',
            'stanbic ibtc' => 'SIBTC',
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

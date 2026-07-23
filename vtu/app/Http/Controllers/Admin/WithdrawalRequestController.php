<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WithdrawalRequest;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

    /**
     * Admin approves the withdrawal request.
     * Deducts from commission balance and marks completed.
     */
    public function approve(Request $request, $id)
    {
        $wr = WithdrawalRequest::with('wallet')->lockForUpdate()->findOrFail($id);

        if ($wr->status !== WithdrawalRequest::STATUS_PENDING) {
            return response()->json(['error' => 'Already processed'], 400);
        }

        DB::transaction(function () use ($wr) {
            $wallet = $wr->wallet ?? ($wr->user ? $wr->user->wallet : null);

            if (!$wallet || $wallet->total_commissions < $wr->amount) {
                throw new \Exception('Insufficient commission balance.');
            }

            $wallet->decrement('total_commissions', $wr->amount);

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'admin_id' => Auth::id(),
                'type' => 'debit',
                'amount' => $wr->amount,
                'reason' => 'Withdrawal approved - #' . $wr->id,
                'withdrawal_request_id' => $wr->id,
            ]);

            $wr->update([
                'status' => WithdrawalRequest::STATUS_COMPLETED,
                'processed_by' => Auth::id(),
                'completed_at' => now(),
            ]);
        });

        return response()->json([
            'message' => 'Withdrawal approved and GHS ' . number_format($wr->amount, 2) . ' deducted from commission balance.',
        ]);
    }

    /**
     * Admin declines the withdrawal request.
     * No re-credit needed since no deduction happened at submission.
     */
    public function decline(Request $request, $id)
    {
        $request->validate(['decline_reason' => 'required|string|max:500']);

        $wr = WithdrawalRequest::findOrFail($id);

        if ($wr->status !== WithdrawalRequest::STATUS_PENDING) {
            return response()->json(['error' => 'Already processed'], 400);
        }

        $wr->update([
            'status' => WithdrawalRequest::STATUS_DECLINED,
            'decline_reason' => $request->decline_reason,
            'processed_by' => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Withdrawal declined.',
        ]);
    }
}

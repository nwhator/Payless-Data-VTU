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
     * Only marks as approved — does NOT send money or fund wallet.
     * Agent will trigger the actual Paystack payout from their side.
     */
    public function approve(Request $request, $id)
    {
        $wr = WithdrawalRequest::with('wallet')->lockForUpdate()->findOrFail($id);

        if ($wr->status !== WithdrawalRequest::STATUS_PENDING) {
            return response()->json(['error' => 'Already processed'], 400);
        }

        DB::transaction(function () use ($wr) {
            $wr->update([
                'status' => WithdrawalRequest::STATUS_APPROVED,
                'processed_by' => Auth::id(),
            ]);
        });

        return response()->json([
            'message' => 'Withdrawal approved. Agent can now withdraw funds.',
        ]);
    }

    /**
     * Admin declines the withdrawal request.
     * Re-credits the agent's commission balance.
     */
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

        return response()->json(['message' => 'Withdrawal declined and commissions re-credited.']);
    }
}

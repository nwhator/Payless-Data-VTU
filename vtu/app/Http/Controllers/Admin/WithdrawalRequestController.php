<?php

/// app/Http/Controllers/Admin/WithdrawalRequestController.php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WithdrawalRequest;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WithdrawalRequestController extends Controller
{
    // fetch all withdrawal requests
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

        DB::transaction(function () use ($wr) {
            $wallet = $wr->wallet ?? ($wr->user ? $wr->user->wallet : null);

            $wr->update([
                'status' => WithdrawalRequest::STATUS_APPROVED,
                'processed_by' => Auth::id(),
            ]);

            if ($wallet) {
                WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'admin_id' => Auth::id(),
                    'type' => 'debit',
                    'amount' => $wr->amount,
                    'reason' => 'Withdrawal approved - #' . $wr->id,
                    'withdrawal_request_id' => $wr->id,
                ]);
            }
        });

        return response()->json(['message' => 'Withdrawal approved']);
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

            $wallet = $wr->wallet ?? ($wr->user ? $wr->user->wallet : null);
            if ($wallet) {
                $wallet->increment('total_commissions', $wr->amount);
            }
        });

        return response()->json(['message' => 'Withdrawal declined']);
    }
}



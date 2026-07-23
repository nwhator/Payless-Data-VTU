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
            'account_details' => 'required|string|max:500',
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

                // No deduction yet — admin will deduct on approval

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
}

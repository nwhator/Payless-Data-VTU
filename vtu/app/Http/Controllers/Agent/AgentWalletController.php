<?php

// app/Http/Controllers/Agent/AgentWalletController.php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\WithdrawalRequest;
use App\Models\Commission; // <<< NEW IMPORT
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
        // ... (Method remains the same as provided)
        $agent = Auth::user();
        
        // Assuming the agent has a one-to-one relationship with a Wallet model
        $wallet = $agent->wallet()->first(['balance', 'total_commissions']);

        if (!$wallet) {
            return response()->json([
                'error' => 'Wallet not found for this agent.'
            ], 404);
        }

        // Calculate pending withdrawals
        $pendingWithdrawals = WithdrawalRequest::where('user_id', $agent->id)
            ->where('status', WithdrawalRequest::STATUS_PENDING)
            ->sum('amount');

        return response()->json([
            'current_balance' => (float) $wallet->balance,
            'total_commissions' => (float) $wallet->total_commissions,
            'pending_withdrawals' => (float) $pendingWithdrawals,
        ]);
    }

    /**
     * Fetches the agent's withdrawal history.
     */
    public function getWithdrawalHistory()
    {
        // ... (Method remains the same as provided)
        $history = WithdrawalRequest::where('user_id', Auth::id())
            ->latest()
            ->get();
            
        return response()->json([
            'data' => $history
        ]);
    }
    
    /**
     * Fetches the agent's commission earnings history.
     * Maps to the 'commissions' table entries.
     */
    public function getCommissionHistory()
    {
        $commissions = Commission::where('user_id', Auth::id())
            // You might want to eager load the product details if needed on the frontend
            // ->with('product:id,name') 
            ->latest()
            ->get([
                'id', 
                'created_at', 
                'product_id', 
                'sale_reference', 
                'sell_price', 
                'cost_price', 
                'profit', // This is the amount earned
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

                //  1. Lock agent commissions/profit record
            
                $wallet = $agent->wallet;

if (!$wallet || $wallet->total_commissions < $amount) {
    throw ValidationException::withMessages([
        'amount' => ['Insufficient commission balance.'],
    ]);
}

                // 2. Create the Withdrawal Request
                $withdrawalRequest = WithdrawalRequest::create([
                    'user_id' => $agent->id,
                    // If you received the previous error (wallet_id is missing), you need to ensure it's added here. 
                    // Assuming for now the old structure worked:
                    // 'wallet_id' => $agent->commissionWallet->id, // Uncomment/add if needed
                    'amount' => $amount,
                    'payout_method' => $validated['processor'],
                    'account_details' => $validated['account_details'],
                    'status' => WithdrawalRequest::STATUS_PENDING,
                ]);

                // 3. Deduct from commissions table (owner instruction)
               $wallet->decrement('total_commissions', $amount);

                return response()->json([
                    'message' => 'Withdrawal request submitted successfully and is awaiting admin approval.',
                    'request' => $withdrawalRequest,
                ], 201);
            });

        } catch (ValidationException $e) {
            // This catches the 'min:20' validation failure and others
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
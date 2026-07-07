<?php

// app/Http/Controllers/Admin/WalletController.php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WallettController extends Controller
{
    public function index() {
        $wallets = Wallet::with('user')->latest()->paginate(20);
        return Inertia::render('Admin/Wallets/Index', [
            'wallets' => $wallets
        ]);
    }

    /**
     * Updates a user's wallet balance (Fund or Deduct).
     * POST /admin/wallet/update
     */
    public function updateUserWallet(Request $request)
    {
        // 1. Validation
        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'action' => ['required', Rule::in(['fund', 'deduct'])],
        ]);

        $userId = $request->user_id;
        $amount = $request->amount;
        $action = $request->action;
        
        // Use a database transaction for data integrity and safety
        return DB::transaction(function () use ($userId, $amount, $action) {
            
            // 2. Fetch User and Wallet
            // We lock the row to prevent race conditions during the transaction
            $user = User::with('wallet')->find($userId); 

            if (!$user || !$user->wallet) {
                return response()->json(['error' => 'User or associated wallet not found.'], 404);
            }
            
            $wallet = $user->wallet;
            $currentBalance = (float) $wallet->balance;
            $newBalance = $currentBalance;
            $message = '';
            
            // 3. Perform Transaction Logic
            if ($action === 'fund') {
                $newBalance = $currentBalance + $amount;
                $message = "Successfully funded {$user->name}'s wallet with GHS " . number_format($amount, 2) . ".";
            } elseif ($action === 'deduct') {
                if ($currentBalance < $amount) {
                    return response()->json([
                        'error' => "Insufficient balance (GHS " . number_format($currentBalance, 2) . ") for deduction."
                    ], 400);
                }
                $newBalance = $currentBalance - $amount;
                $message = "Successfully deducted GHS " . number_format($amount, 2) . " from {$user->name}'s wallet.";
            }

            // 4. Update Wallet Database
            $wallet->balance = $newBalance;
            $wallet->save();

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'admin_id' => Auth::id(),
                'type' => $action === 'fund' ? 'credit' : 'debit',
                'amount' => $amount,
                'reason' => $message,
            ]);

            // 5. Success Response
            return response()->json([
                'message' => $message,
                'new_balance' => (float) $newBalance, // Return the new balance
            ], 200);
        });
    }
}

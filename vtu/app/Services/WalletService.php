<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WalletService
{
    /**
     * Retrieves the current balance of the user's wallet.
     * Assumes a User has one related Wallet model.
     * * @param User $user
     * @return float
     */
    public function getBalance(User $user): float
    {
        // Use eager loading to ensure the wallet is fetched, or create one if missing (lazy creation)
        $wallet = $user->wallet ?? $this->createWalletForUser($user);

        return (float) $wallet->balance;
    }

    /**
     * Atomically debits the specified amount from the user's wallet 
     * and records the transaction.
     * * @param User $user The user performing the purchase.
     * @param float $amount The amount to deduct.
     * @param string $description Description for the transaction.
     * @param string $type Transaction type (e.g., 'purchase').
     * @param int $product_id The product being purchased.
     * @param array $meta Additional metadata for the transaction.
     * @return Transaction
     * @throws \Exception If the user has insufficient funds.
     */
    public function debit(
        User $user, 
        float $amount, 
        string $description, 
        string $type, 
        int $product_id, 
        array $meta
    ): Transaction
    {
        // Ensure the operation is atomic (all or nothing)
        return DB::transaction(function () use ($user, $amount, $description, $type, $product_id, $meta) {
            
            $wallet = $user->wallet;

            // 1. Check for insufficient funds (critical safety check)
            if ($wallet->balance < $amount) {
                throw new \Exception("Insufficient wallet funds to complete this purchase.");
            }
            
            // 2. Perform the debit
            // We use the minus equals operator here for simplicity,
            // but for high concurrency, you might use ->decrement() on the model directly.
            $wallet->balance -= $amount;
            $wallet->save();
            
            // 3. Record the debit transaction
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => $type, // 'purchase'
                'amount' => $amount,
                'currency' => 'GHS', // Assuming GHS is standard wallet currency
                'description' => $description,
                'product_id' => $product_id,
                'meta' => $meta,
                'status' => 'success', // Instant success for wallet debit
                'reference' => 'WLT-' . Str::upper(Str::random(10)), // Internal wallet reference
                'cost_price' => $amount, // Cost is the full amount deducted from the wallet
            ]);

            return $transaction;
        });
    }

    /**
     * Helper to create a wallet if one doesn't exist.
     * * @param User $user
     * @return Wallet
     */
    protected function createWalletForUser(User $user): Wallet
    {
        return $user->wallet()->create(['balance' => 0.00]);
    }

    /**
     * Atomically credits the specified amount to the user's wallet.
     * * @param User $user The user to credit.
     * @param float $amount The amount to add.
     * @param string $description Description for the transaction.
     * @param string $type Transaction type (e.g., 'credit', 'reversal'). <-- NEW
     * @param array $meta Additional metadata for the transaction. <-- NEW
     * @param int|null $sourceTransactionId The ID of the transaction that initiated the credit (e.g., Paystack transaction).
     * @param int|null $productId The product involved in the transaction (for reversals). <-- NEW
     * @throws \Exception If the wallet update fails.
     */
    public function credit(
        User $user, 
        float $amount, 
        string $description, 
        string $type = 'credit', // Default to 'credit'
        array $meta = [], // Default to empty array
        ?int $sourceTransactionId = null,
        ?int $productId = null
    ): void
    {
        DB::transaction(function () use ($user, $amount, $description, $type, $meta, $sourceTransactionId, $productId) {
            
            // Ensure the wallet exists (handles lazy creation)
            $wallet = $user->wallet ?? $this->createWalletForUser($user);

            // Perform the credit
            $wallet->balance += $amount;
            $wallet->save();
            
            // Record the credit transaction
            Transaction::create([
                'user_id' => $user->id,
                'type' => $type, // Use the provided type ('credit' or 'reversal')
                'amount' => $amount,
                'currency' => 'GHS',
                'description' => $description,
                'product_id' => $productId, // <-- Record the product ID if provided
                'meta' => $meta, // <-- Record the meta data
                'status' => 'success', 
                'reference' => 'CRT-' . Str::upper(Str::random(10)),
                'paystack_ref' => $sourceTransactionId, 
                'cost_price' => 0.00,
            ]);
        });
    }
}
<?php

namespace App\Services;

use App\Models\Transaction;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class TransactionService
{
    /**
     * Record a transaction.
     */
    public static function record(
        ?Model $user,
        string $type, // credit | debit
        float $amount,
        string $description,
        ?int $product_id = null,
        array $meta = [],
        string $status = 'success',
        ?string $currency = 'GHS',
        ?string $paystack_ref = null, // Paystack reference (optional)
        ?string $email = null // NEW: email of payer
    ): Transaction {
        return Transaction::create([
            'user_id'      => $user->id ?? null,
            'user_role'    => $user->role ?? 'agents-customer',
            'reference'    => Str::uuid(),
            'paystack_ref' => $paystack_ref,
            'type'         => strtolower($type),
            'amount'       => $amount,
            'currency'     => $currency,
            'status'       => $status,
            'product_id'   => $product_id,
            'description'  => $description,
            'meta'         => $meta,
            'email'        => $email, //  new field
        ]);
    }

    /**
     * Update transaction status or Paystack reference.
     */
    public static function update(Transaction $transaction, array $data): bool
    {
        return $transaction->update($data);
    }

    /**
     * Find transaction by internal or Paystack reference.
     */
    public static function findByReference(string $ref): ?Transaction
    {
        return Transaction::where('reference', $ref)
            ->orWhere('paystack_ref', $ref)
            ->first();
    }
}

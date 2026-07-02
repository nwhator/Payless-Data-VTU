<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_role',
        'email',
        'wallet_id',
        'reference',
        'paystack_ref',
        'type',
        'amount',
        'currency',
        'status',
        'product_id',
        'description',
        'meta',
        // ✅ NEW: Fee-related fields
        'fee_applied',
        'fee_percentage',
        'fee_amount',
        'total_with_fee',
    ];


    protected $casts = [
        'meta' => 'array',
        'amount' => 'decimal:2',
        // ✅ NEW: Cast fee fields to appropriate types
        'fee_applied' => 'boolean',
        'fee_percentage' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'total_with_fee' => 'decimal:2',
    ];

    /**
     * Relationships
     */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    /**
     * Accessors / Helpers
     */

    // ✅ Format amount with currency for easy display
    public function getFormattedAmountAttribute(): string
    {
        $currency = $this->currency ?? 'GHS';
        return "{$currency} " . number_format($this->amount, 2);
    }

    // ✅ NEW: Format fee amount with currency
    public function getFormattedFeeAttribute(): string
    {
        if (!$this->fee_applied) {
            return 'No fee';
        }
        $currency = $this->currency ?? 'GHS';
        return "{$currency} " . number_format($this->fee_amount, 2);
    }

    // ✅ NEW: Format total with fee
    public function getFormattedTotalAttribute(): string
    {
        $currency = $this->currency ?? 'GHS';
        $total = $this->total_with_fee ?? $this->amount;
        return "{$currency} " . number_format($total, 2);
    }

    // ✅ Check if it's a credit transaction
    public function isCredit(): bool
    {
        return strtolower($this->type) === 'credit';
    }

    // ✅ Check if it's a debit transaction
    public function isDebit(): bool
    {
        return strtolower($this->type) === 'debit';
    }

    // ✅ NEW: Check if transaction has fee applied
    public function hasFee(): bool
    {
        return $this->fee_applied && $this->fee_amount > 0;
    }

    // ✅ NEW: Get fee breakdown as array
    public function getFeeBreakdown(): array
    {
        if (!$this->hasFee()) {
            return [
                'fee_applied' => false,
                'amount' => $this->amount,
                'fee' => 0,
                'total' => $this->amount,
            ];
        }

        return [
            'fee_applied' => true,
            'amount' => $this->amount,
            'fee_percentage' => $this->fee_percentage,
            'fee' => $this->fee_amount,
            'total' => $this->total_with_fee,
        ];
    }

    /**
     * Find a transaction by Paystack reference.
     */
    public static function findByPaystackRef(string $reference): ?self
    {
        return self::where('paystack_ref', $reference)->first();
    }

    /**
     * Scopes
     */

    // ✅ NEW: Scope to get only transactions with fees
    public function scopeWithFees($query)
    {
        return $query->where('fee_applied', true)->where('fee_amount', '>', 0);
    }

    // ✅ NEW: Scope to get transactions without fees
    public function scopeWithoutFees($query)
    {
        return $query->where(function ($q) {
            $q->where('fee_applied', false)
              ->orWhereNull('fee_applied')
              ->orWhere('fee_amount', 0);
        });
    }

    // ✅ NEW: Scope to get Paystack transactions only
    public function scopePaystackOnly($query)
    {
        return $query->whereNotNull('paystack_ref');
    }

    // ✅ NEW: Scope to get wallet transactions only
    public function scopeWalletOnly($query)
    {
        return $query->whereNull('paystack_ref')
                     ->where('type', '!=', 'payment');
    }
}
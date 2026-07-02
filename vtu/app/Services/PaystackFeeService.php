<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PaystackFeeService
{
    /**
     * Default fee percentage (2.5%)
     * Can be overridden by config or database settings
     */
    private const DEFAULT_FEE_PERCENTAGE = 2.5;

    /**
     * Cache key for fee configuration
     */
    private const CACHE_KEY = 'paystack_fee_config';

    /**
     * Get the current Paystack fee percentage
     * 
     * @return float Fee percentage (e.g., 2.5 for 2.5%)
     */
    public function getFeePercentage(): float
    {
        // Try to get from cache first (for performance)
        $cached = Cache::get(self::CACHE_KEY);
        if ($cached !== null) {
            return (float) $cached;
        }

        // Try to get from config
        $configFee = config('paystack.transaction_fee_percentage');
        if ($configFee !== null) {
            Cache::put(self::CACHE_KEY, $configFee, now()->addHours(24));
            return (float) $configFee;
        }

        // Fallback to default
        return self::DEFAULT_FEE_PERCENTAGE;
    }

    /**
     * Calculate the fee amount for a given purchase amount
     * 
     * @param float $amount The original purchase amount in cedis
     * @return float The fee amount in cedis
     */
    public function calculateFee(float $amount): float
    {
        $percentage = $this->getFeePercentage();
        $fee = ($amount * $percentage) / 100;
        
        // Round to 2 decimal places for currency
        return round($fee, 2);
    }

    /**
     * Calculate the total amount including fee
     * 
     * @param float $amount The original purchase amount in cedis
     * @return float The total amount including fee in cedis
     */
    public function calculateTotal(float $amount): float
    {
        $fee = $this->calculateFee($amount);
        return round($amount + $fee, 2);
    }

    /**
     * Get a breakdown of the payment with fee details
     * 
     * @param float $amount The original purchase amount in cedis
     * @return array ['amount' => float, 'fee' => float, 'total' => float, 'percentage' => float]
     */
    public function getPaymentBreakdown(float $amount): array
    {
        $percentage = $this->getFeePercentage();
        $fee = $this->calculateFee($amount);
        $total = $this->calculateTotal($amount);

        return [
            'amount' => round($amount, 2),
            'fee' => $fee,
            'total' => $total,
            'percentage' => $percentage,
        ];
    }

    /**
     * Check if Paystack fee should be applied
     * (You can add conditions here, e.g., exclude wallet payments)
     * 
     * @param string $paymentMethod Payment method ('paystack', 'wallet', etc.)
     * @return bool
     */
    public function shouldApplyFee(string $paymentMethod = 'paystack'): bool
    {
        // Only apply fee for Paystack payments, not wallet
        return $paymentMethod === 'paystack';
    }

    /**
     * Update the fee percentage (useful for admin settings)
     * 
     * @param float $percentage New fee percentage
     * @return void
     */
    public function updateFeePercentage(float $percentage): void
    {
        if ($percentage < 0 || $percentage > 100) {
            throw new \InvalidArgumentException('Fee percentage must be between 0 and 100');
        }

        Cache::put(self::CACHE_KEY, $percentage, now()->addHours(24));
        
        Log::info('Paystack fee percentage updated', [
            'new_percentage' => $percentage,
            'timestamp' => now()
        ]);
    }

    /**
     * Clear the cached fee configuration
     * 
     * @return void
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
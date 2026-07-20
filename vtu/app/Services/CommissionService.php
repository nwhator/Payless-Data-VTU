<?php

namespace App\Services;

use App\Models\User;
use App\Models\Product;
use App\Models\Commission;
use App\Models\Wallet;
use App\Models\AgentProductPrice;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommissionService
{
    /**
     * Calculates and records commission based on the agent's predefined added_amount (markup).
     * Also credits the agent's wallet.
     * * @param User $agent The store owner who earned the commission.
     * @param Product $product The product purchased.
     * @param float $sellPrice The price the customer paid (for logging purposes).
     * @param string $saleReference The Paystack/Transaction reference.
     * @return Commission|null
     */
    public static function record(User $agent, Product $product, float $sellPrice, string $saleReference): ?Commission
    {
        try {
            // 1. Get the Agent's Commission (added_amount) and Cost Price
            $agentPriceRecord = AgentProductPrice::where('agent_id', $agent->id) 
                ->where('product_id', $product->id)
                ->first();

            // Fallback for cases where the product has no custom price set by the agent
            if (!$agentPriceRecord) {
                Log::warning('Agent has no custom price record, commission is zero.', [
                    'agent_id' => $agent->id, 
                    'product_id' => $product->id
                ]);
                return null; 
            }
            
            // The commission is the added_amount set by the agent.
            $commissionAmount = round((float) $agentPriceRecord->added_amount, 2); 
            $agentCostPrice = round((float) $agentPriceRecord->agent_price, 2); // This is the final customer price

            if ($commissionAmount <= 0) {
                Log::warning('Predefined commission (added_amount) is zero or negative. Skipping recording.', [
                    'agent_id' => $agent->id, 
                    'product_id' => $product->id, 
                    'commission_amount' => $commissionAmount,
                ]);
                return null;
            }

            return DB::transaction(function () use ($agent, $product, $sellPrice, $agentCostPrice, $commissionAmount, $saleReference) {
                
                // 3. Record the Commission
                $commission = Commission::create([
                    'user_id' => $agent->id,
                    'role' => 'agent', 
                    'product_id' => $product->id,
                    'sale_reference' => $saleReference,
                    'cost_price' => $agentCostPrice - $commissionAmount, // Base Admin Cost Price (Approximation)
                    'sell_price' => $agentCostPrice, // Agent's sell price (the price the customer paid)
                    'profit' => $commissionAmount, // This is the commission amount (the added_amount)
                    'type' => 'sale',
                    'status' => 'earned', 
                    'meta' => null,
                ]);

                // 4. Credit the Agent's Wallet (auto-funds to spendable balance)
                $wallet = Wallet::firstOrCreate(['user_id' => $agent->id]);

                $wallet->increment('balance', $commissionAmount);
                $wallet->increment('total_commissions', $commissionAmount);
                $agent->increment('wallet_balance', $commissionAmount);

                Log::info('Agent commission automatically credited to wallet.', [
                    'agent_id' => $agent->id,
                    'commission_amount' => $commissionAmount,
                    'sale_reference' => $saleReference,
                ]);

                return $commission;
            });
            
        } catch (\Throwable $e) {
            Log::error('Commission recording failed.', [
                'agent_id' => $agent->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SupplierWallet;
use App\Models\CommissionSetting;
use App\Models\User;
use App\Models\Wallet;
use App\Services\PricingService;
use App\Jobs\SyncProductsFromSupplier;
use App\Models\Transaction;

class AdminController extends Controller
{
    public function index()
    {
        if (cache()->missing('last_product_sync') || now()->diffInMinutes(cache('last_product_sync')) >= 30) {
            SyncProductsFromSupplier::dispatch();
            cache(['last_product_sync' => now()], now()->addMinutes(30));
        }

        return response()->json([
            'wallet_balance' => SupplierWallet::query()->value('balance'),
            'markup' => PricingService::getMarkup(),
            'commission' => CommissionSetting::query()->first(['type', 'value']),
        ]);
    }

    public function getMarkup()
    {
        return response()->json(['markup' => PricingService::getMarkup()]);
    }

    public function setMarkup(Request $r)
    {
        $r->validate(['markup' => 'required|numeric|min:0']);
        PricingService::setMarkup($r->input('markup'));
        return response()->json(['message' => 'Markup updated successfully']);
    }

    public function fundSupplierWallet(Request $r)
    {
        $r->validate([
            'amount' => 'required|numeric|min:0.01',
            'note' => 'nullable|string'
        ]);

        $wallet = SupplierWallet::query()->firstOrFail();
        $wallet->increment('balance', $r->amount);

        Transaction::create([
            'user_id' => auth()->id(),
            'reference' => 'supplier_fund_' . uniqid(),
            'amount' => $r->amount,
            'status' => 'success',
            'type' => 'supplier_fund',
            'meta' => ['note' => $r->input('note')]
        ]);

        return response()->json([
            'message' => 'Supplier wallet funded successfully',
            'balance' => $wallet->balance
        ]);
    }

    public function getCommission()
    {
        $cfg = CommissionSetting::query()->first();
        return response()->json([
            'type' => $cfg->type ?? 'fixed',
            'value' => (float)($cfg->value ?? 0)
        ]);
    }

    public function setCommission(Request $r)
    {
        $r->validate([
            'type' => 'required|in:fixed,percent',
            'value' => 'required|numeric|min:0'
        ]);

        CommissionSetting::query()->updateOrCreate([], [
            'type' => $r->type,
            'value' => $r->value
        ]);

        return response()->json(['message' => 'Commission updated successfully']);
    }

    public function listAgents()
    {
        $agents = User::query()
            ->where('role', 'agent')
            ->with('wallet')
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'email' => $a->email,
                'agent_slug' => $a->agent_slug,
                'wallet_balance' => $a->wallet->balance ?? 0,
                'joined' => $a->created_at->format('Y-m-d'),
            ]);

        return response()->json($agents);
    }
}

<?php

namespace App\Services;

use App\Models\Setting;

class PlatformService
{
    public static function addProfit(float $amount): void
    {
        $balance = (float) Setting::query()->where('key', 'platform_balance')->value('value') ?? 0.0;
        Setting::query()->updateOrCreate(
            ['key' => 'platform_balance'],
            ['value' => $balance + $amount]
        );
    }
}

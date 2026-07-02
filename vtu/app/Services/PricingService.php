<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\CommissionSetting;

class PricingService
{
    public static function getMarkup(): float
    {
        return (float) Setting::query()->where('key', 'markup')->value('value') ?? 0.0;
    }

    public static function setMarkup(float $value): void
    {
        Setting::query()->updateOrCreate(
            ['key' => 'markup'],
            ['value' => $value]
        );
    }

    public static function applyMarkup(float $supplierPrice): float
    {
        $markup = static::getMarkup();
        return round($supplierPrice + $markup, 2);
    }

    public static function getCommissionConfig(): array
    {
        $cfg = CommissionSetting::query()->first();
        return $cfg ? ['type' => $cfg->type, 'value' => $cfg->value] : ['type' => 'fixed', 'value' => 0.0];
    }

    public static function computeCommission(float $displayPrice): float
    {
        $cfg = static::getCommissionConfig();
        return $cfg['type'] === 'percent'
            ? round(($displayPrice * $cfg['value']) / 100, 2)
            : round($cfg['value'], 2);
    }
}

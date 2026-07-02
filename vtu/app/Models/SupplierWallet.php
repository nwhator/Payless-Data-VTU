<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierWallet extends Model
{
    protected $fillable = ['balance', 'currency'];

    public static function getWallet(): self
    {
        return static::firstOrFail();
    }

    public function debit(float $amount): void
    {
        if ($amount < 0) throw new \InvalidArgumentException('Amount must be positive');
        $this->balance -= $amount;
        $this->save();
    }

    public function credit(float $amount): void
    {
        $this->balance += $amount;
        $this->save();
    }
}

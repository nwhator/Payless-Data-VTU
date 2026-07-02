<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionSetting extends Model
{
    protected $fillable = ['type', 'value'];
    protected $casts = ['value' => 'float'];

    public static function current()
    {
        return static::first();
    }
}

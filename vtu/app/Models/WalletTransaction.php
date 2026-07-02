<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'wallet_id',
        'admin_id',
        'type',
        'amount',
        'reason'
    ];

    public function wallet() {
        return $this->belongsTo(Wallet::class);
    }

    public function admin() {
        return $this->belongsTo(User::class, 'admin_id');
    }
}


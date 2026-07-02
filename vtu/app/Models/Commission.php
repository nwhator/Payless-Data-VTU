<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Commission extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'role',
        'product_id',
        'sale_reference',
        'cost_price',
        'sell_price',
        'profit',
        'type',
        'status',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'cost_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'profit' => 'decimal:2',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

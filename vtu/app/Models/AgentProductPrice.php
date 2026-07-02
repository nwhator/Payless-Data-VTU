<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentProductPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'agent_id',
        'product_id',
        'added_amount',
        'agent_price',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}

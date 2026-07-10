<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
      'product_code',
      'name',
      'network',
      'category',
      'capacity',
      'capacity_value',
      'capacity_unit',
      'validity',
      'price',
      'currency',
      'active',
      'customer_margin',
      'agent_margin',
      'customer_price',
      'agent_price',
    ];


    protected $casts = [
      'price' => 'float',
      'capacity_value' => 'float',
      'active' => 'boolean',
      'customer_margin' => 'float',
      'agent_margin' => 'float',
    ];

    public function agentPrices()
  {
      return $this->hasMany(\App\Models\AgentProductPrice::class, 'product_id');
  }

}

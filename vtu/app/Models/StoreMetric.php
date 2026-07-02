<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreMetric extends Model
{
    protected $fillable = ['store_id', 'visits', 'link_orders', 'purchases'];

    public function store()
    {
        return $this->belongsTo(AgentStore::class);
    }
}


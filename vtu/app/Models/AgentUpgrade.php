<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentUpgrade extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'payment_reference', 'status'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}


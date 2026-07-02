<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AgentStore extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'store_name',
        'store_slug',
        'description',
        'banner_text',
        'banner_image',
        'whatsapp_number',
        'whatsapp_link',
        'active',
        'publish',
    ];

    // Auto-generate slug
    protected static function booted()
    {
        static::creating(function ($store) {
            if (empty($store->store_slug)) {
                $store->store_slug = Str::slug($store->store_name) . '-' . Str::random(5);
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}


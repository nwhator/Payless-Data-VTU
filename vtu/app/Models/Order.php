<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'agent_id',
        'store_id',
        'network',
        'recipient',
        'data_volume',
        'amount',
        'currency',
        'payment_status',
        'status',
        'payment_reference',
        'reference',
        'transaction_id',
        'order_source',
        'ip_address',
        'user_agent',
        'vendor_response',
    ];

    protected $casts = [
        'vendor_response' => 'array',
        'amount' => 'float',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function store()
    {
        return $this->belongsTo(AgentStore::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeSuccessful($query)
    {
        return $query->whereIn('payment_status', ['success', 'successful', 'paid']);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeFromStore($query)
    {
        return $query->where('order_source', 'agent_store');
    }

    /**
     * 🔎 Universal filter scope
     * Usage: Order::filter(['search' => '0241234567', 'status' => 'completed', 'date_filter' => 'this_month'])
     */
    public function scopeFilter($query, array $filters)
    {
        $query->when($filters['search'] ?? false, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('recipient', 'like', "%{$search}%")
                    ->orWhere('network', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhere('payment_status', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%")
                    ->orWhere('transaction_id', 'like', "%{$search}%");
            });
        });

        $query->when($filters['status'] ?? false, fn($q, $status) => $q->where('status', $status));
        $query->when($filters['payment_status'] ?? false, fn($q, $ps) => $q->where('payment_status', $ps));
        $query->when($filters['network'] ?? false, fn($q, $network) => $q->where('network', $network));

        // --- NEW: Date Filtering Logic ---
        $query->when($filters['date_filter'] ?? false, function ($query, $filter) {
            $query->when($filter === 'today', fn($q) => $q->whereDate('created_at', now()->today()));
            $query->when($filter === 'yesterday', fn($q) => $q->whereDate('created_at', now()->subDay()));
            $query->when($filter === 'this_week', fn($q) => $q->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]));
            $query->when($filter === 'this_month', fn($q) => $q->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]));
        });
        // --- END NEW LOGIC ---

        return $query;
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors / Helpers
    |--------------------------------------------------------------------------
    */

    public function getFormattedAmountAttribute(): string
    {
        return '₵' . number_format($this->amount, 2);
    }

    public function getIsFromStoreAttribute(): bool
    {
        return $this->order_source === 'agent_store';
    }
}

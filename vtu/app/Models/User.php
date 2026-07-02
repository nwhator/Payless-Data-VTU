<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne; 
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;


class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'agent_slug',
        'wallet_balance',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Get the wallet associated with the user.
     * @return HasOne
     */
    public function wallet(): HasOne // <<< ADDED TYPE HINT
    {
        return $this->hasOne(Wallet::class);
    }

    /**
     * Get the transactions for the user.
     * @return HasMany
     */
    public function transactions(): HasMany // <<< ADDED TYPE HINT
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Get the commissions earned by the user.
     * @return HasMany
     */
    public function commissions(): HasMany // <<< ADDED TYPE HINT
    {
        return $this->hasMany(Commission::class);
    }

        /**
     * Get the orders made by the user.
     * @return HasMany
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }


    /**
     * Get the withdrawal requests made by the user.
     * @return HasMany
     */
    public function withdrawalRequests(): HasMany // <<< ADDED TYPE HINT
    {
        return $this->hasMany(WithdrawalRequest::class);
    }

    /**
     * Get the AgentStore associated with the user.
     * @return HasOne
     */
    public function store(): HasOne // <<< ADDED TYPE HINT (and fixed namespace below)
    {
        return $this->hasOne(AgentStore::class); // Assuming AgentStore is in App\Models\
    }

}

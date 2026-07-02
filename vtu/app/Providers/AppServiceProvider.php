<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\User; 
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\App; // Import the App facade
use Illuminate\Support\Facades\Redirect; // Keep for type hinting/optional use
use Illuminate\Support\Facades\Route; 
use Illuminate\Routing\Redirector; // Import the Redirector class

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Existing User Model Event Listener
        User::created(function (User $user) {
            $user->wallet()->create(['balance' => 0.00]);
        });

        //  FIX: Use App::bind to override the Redirector's home path logic ⭐
        $this->app->bind(Redirector::class, function ($app) {
            return new class($app['url']) extends Redirector {
                public function home($fallback = '/')
                {
                    if (Auth::check()) {
                        $user = Auth::user();
    
                        if ($user->role === 'agent') {
                            return route('agent.dashboard', absolute: false);
                        }
    
                        if ($user->role === 'customer') {
                            return route('customer.dashboard', absolute: false);
                        }
                    }
                    
                    // Fallback to the generic route if unauthenticated or role unhandled
                    return $fallback;
                }
            };
        });
        
    }
}
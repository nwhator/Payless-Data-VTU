<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $role  <-- This captures 'customer' from the route definition
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // 1. Check if the user is authenticated
        if (!Auth::check()) {
            return redirect('login'); // Or abort(401)
        }
        
        $user = Auth::user();
        
        // 2. Check if the user's role matches the required role
        if ($user->role !== $role) {
            // Redirect or return an access denied error
            return redirect('/')->with('error', 'Access Denied.');
        }

        return $next($request);
    }
}
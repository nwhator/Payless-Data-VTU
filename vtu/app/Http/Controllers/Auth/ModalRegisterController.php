<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;

class ModalRegisterController extends Controller
{
    /**
     * Handle an incoming registration request from the landing page modal.
     */
    public function login(Request $request)
    {
        // 1. Validation
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        // 2. Attempt authentication
        $credentials = $request->only('email', 'password');

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // 3. Get authenticated user
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user) {
            throw new \Exception('Authenticated user not found.');
        }

        // 4. Load wallet relationship and regenerate session
        $user->load('wallet');
        $request->session()->regenerate();

        // 5. Return Inertia response
        return Inertia::render('Welcome', [
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
            ],
            'wallet' => [
                'balance' => $user->wallet->balance,
            ],
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validation (ensures unique email and strong password)
        $request->validate([
            'name' => 'required|string|max:255',
            // This ensures the email is unique (correct for REGISTER)
            'email' => 'required|string|email|max:255|unique:'.User::class, 
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // 2. Create the User (Wallet automatically created via Model Event)
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'customer', // Set default role
        ]);

        event(new Registered($user));
        
        // 3. Log the user in
        Auth::login($user);
        
        // Load the newly created wallet relationship to get the balance
        $user->load('wallet');

        // 4. Return the Inertia response
        return Inertia::render('Welcome', [
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role, 
                ],
            ],
            // Pass the balance from the automatically created wallet
            'wallet' => [
                'balance' => $user->wallet->balance, 
            ],
            
        ]);
    }

}
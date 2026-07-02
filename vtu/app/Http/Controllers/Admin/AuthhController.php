<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Models\User; // ✅ Make sure this import exists


class AuthhController extends Controller
{
    public function showLogin(Request $request)
    {
        // If already logged in and admin, redirect straight to dashboard
        if ($request->user() && $request->user()->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('admin/login', [
            'status' => session('status'),
            'errors' => session('errors') ? session('errors')->getMessages() : (object)[],
            'old' => $request->old(),
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $credentials = $request->only('email', 'password');

        if (!Auth::attempt($credentials, $request->filled('remember'))) {
            return Redirect::back()
                ->withErrors(['general' => ['Invalid credentials']])
                ->withInput($request->only('email'));
        }

        $request->session()->regenerate();

        $user = $request->user();

        // ✅ Check if the user role is admin
        if ($user->role !== 'admin') {
            Auth::logout();
            return Redirect::back()
                ->withErrors(['general' => ['Not authorized as admin']])
                ->withInput($request->only('email'));
        }

        return redirect()->intended(route('admin.dashboard'));
    }

    public function updateProfile(Request $request)
    {
        /** @var User $admin */   //
        $admin = Auth::user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users')->ignore($admin->id)],
            'password' => ['nullable', 'confirmed', 'min:8'],
        ]);

        $admin->name = $validated['name'];
        $admin->email = $validated['email'];

        if (!empty($validated['password'])) {
            $admin->password = Hash::make($validated['password']);
        }

        $admin->save();

        return back()->with('success', 'Profile updated successfully.');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        //  Return a simple JSON success message.
        return response()->json([
            'message' => 'Logged out successfully.'
        ], 200);
    }
}

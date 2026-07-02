<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DatamartWebhookController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the Application's 'api' middleware group.
| They are typically stateless and do not require CSRF protection.
|
*/

// CRITICAL: This route defines the endpoint where the vendor sends updates.
// The full URL is https://smarttopup.net/api/datamart/webhook
// This route now correctly sits in the API middleware group which does NOT have CSRF protection.
Route::post('/datamart/webhook', [DatamartWebhookController::class, 'handle'])
    ->name('datamart.webhook');

// You can add other API routes below this line
// Route::get('/user', function (Request $request) { ... });
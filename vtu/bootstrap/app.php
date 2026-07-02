<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php', // Ensure the API routes file is loaded
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )

    ->withMiddleware(function (Middleware $middleware) {
        // Global cookie encryption rules
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // --- NEW: Explicitly define the 'api' middleware group ---
        // This group should be stateless and MUST NOT contain CSRF protection.
        $middleware->api(append: [
            // You can add middleware like rate limiting here if needed, 
            // but for webhooks, often you just need it to be bare.
        ]);
        // --- END NEW ---

        // Web middleware stack (where CSRF protection is required)
        $middleware->web(append: [
            \App\Http\Middleware\VerifyCsrfToken::class, // CSRF protection stays here
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // ✅ Add custom middleware aliases here
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'agent' => \App\Http\Middleware\AgentMiddleware::class,
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })

    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
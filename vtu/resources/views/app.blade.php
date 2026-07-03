<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<meta name="csrf-token" content="{{ csrf_token() }}">

<!-- 1. SEO & Core Meta Tags -->
<meta name="description" content="The leading VTU platform in Ghana for agents and customers to manage digital product sales, track commissions, and process instant data and airtime top-ups.">
<meta name="keywords" content="VTU, Ghana, VTU in Ghana, data, airtime, top-up, commissions, agent, reseller, mobile, telecom, instant payment, ghana, nigeria">
<meta name="author" content="{{ config('app.name', 'Payless Data') }}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{{ url()->current() }}">

<!-- 2. Open Graph (OG) Tags for Facebook, LinkedIn, etc. -->
<meta property="og:title" content="{{ $page['props']['title'] ?? config('app.name', 'Payless Data') }}">
<meta property="og:description" content="The leading platform for agents and customers to manage digital product sales, track commissions, and process instant data and airtime top-ups.">
<meta property="og:type" content="website">
<meta property="og:url" content="{{ url()->current() }}">
<meta property="og:image" content="{{ asset('images/social-share-image.jpg') }}">
<meta property="og:site_name" content="{{ config('app.name', 'Payless Data') }}">
<meta property="og:locale" content="{{ str_replace('_', '-', app()->getLocale()) }}">

<!-- 3. Twitter Card Tags -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@PaylessData">
<meta name="twitter:creator" content="@PaylessData">
<meta name="twitter:title" content="{{ $page['props']['title'] ?? config('app.name', 'Payless Data') }}">
<meta name="twitter:description" content="The leading platform for agents and customers to manage digital product sales, track commissions, and process instant data and airtime top-ups.">
<meta name="twitter:image" content="{{ asset('images/social-share-image.jpg') }}">

<!-- 4. Mobile & App Styling -->
<meta name="theme-color" content="#4DFF8F"> {{-- Primary color for browser UI on mobile --}}

{{-- Inline script to detect system dark mode preference and apply it immediately --}}
<script>
    (function() {
        const appearance = '{{ $appearance ?? "system" }}';

        if (appearance === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark');
            }
        }
    })();
</script>

<style>
    html {
        background-color: oklch(1 0 0);
    }
    html.dark {
        background-color: oklch(0.145 0 0);
    }
    html, body {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden !important;
    }
</style>

<title inertia>{{ $page['props']['title'] ?? config('app.name', 'Payless Data') }}</title>

<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">

<link rel="preconnect" href="https://fonts.bunny.net">
<link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>

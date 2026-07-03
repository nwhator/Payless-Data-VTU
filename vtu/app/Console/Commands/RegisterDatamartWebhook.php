<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class RegisterDatamartWebhook extends Command
{
    protected $signature = 'datamart:register-webhook';
    protected $description = 'Register Payless Data webhook URL with Datamart API';

    public function handle()
    {
        $url = config('app.url') . '/api/vendor/webhook';
        $base = config('services.datamart.base', config('app.datamart_base', env('DATAMART_API_BASE')));

        $response = Http::withHeaders([
            'X-API-Key'    => env('DATAMART_API_KEY'),
            'X-API-Secret' => env('DATAMART_API_SECRET'),
        ])->put("{$base}/webhook", [
            'webhook_url' => $url,
        ]);

        if ($response->successful()) {
            $this->info('✅ Webhook registered successfully!');
        } else {
            $this->error('❌ Failed to register webhook: ' . $response->body());
        }

        return 0;
    }
}

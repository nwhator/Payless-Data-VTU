<?php

namespace App\Jobs;

use App\Models\Product;
use App\Services\PricingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncProductsFromSupplier implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => config('services.datamart.key'),
                'X-API-Secret' => config('services.datamart.secret'),
                'Content-Type' => 'application/json',
            ])->get(config('services.datamart.base') . '/v1/products');

            if ($response->failed()) {
                Log::error('❌ Product sync failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return;
            }

            $products = $response->json('data') ?? $response->json();
            if (!is_array($products) || empty($products)) {
                Log::warning('⚠️ No product data returned from supplier');
                return;
            }

            $synced = 0;
            foreach ($products as $item) {
                $supplierPrice = (float)($item['price'] ?? 0);
                $displayPrice = PricingService::applyMarkup($supplierPrice);

                Product::updateOrCreate(
                    ['api_code' => $item['code'] ?? null],
                    [
                        'sku'           => $item['sku'] ?? null,
                        'name'          => $item['name'] ?? 'Unnamed Product',
                        'network'       => $item['network'] ?? null,
                        'type'          => strtolower($item['type'] ?? 'airtime'),
                        'base_price'    => $supplierPrice,
                        'display_price' => $displayPrice,
                        'active'        => $item['active'] ?? true,
                        'meta'          => json_encode($item),
                    ]
                );

                $synced++;
            }

            Log::info("✅ Datamart sync complete — {$synced} products synced.");

        } catch (\Throwable $e) {
            Log::error('🔥 SyncProductsFromSupplier Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}

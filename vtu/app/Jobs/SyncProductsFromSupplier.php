<?php

namespace App\Jobs;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use App\Services\IDataService;

class SyncProductsFromSupplier implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        try {
            $idataService = app(IDataService::class);
            $synced = 0;

            foreach ($idataService->availableNetworks() as $network) {
                $response = $idataService->packages($network);

                if ($response->failed()) {
                    Log::error('Package sync failed', [
                        'network' => $network,
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                    continue;
                }

                $payload = $response->json();
                $packages = $payload['packages'] ?? [];
                $normalizedNetwork = $idataService->normalizeNetworkForProduct($payload['network'] ?? $network);

                foreach ($packages as $item) {
                    $dataSize = $item['data_size'] ?? null;

                    Product::updateOrCreate(
                        ['product_code' => (string) ($item['package_id'] ?? $item['label'] ?? $network)],
                        [
                            'name' => $normalizedNetwork . ' ' . ($dataSize !== null ? $dataSize . 'GB' : ($item['label'] ?? 'Bundle')),
                            'category' => 'data',
                            'network' => $normalizedNetwork,
                            'capacity' => $dataSize !== null ? $dataSize . 'GB' : ($item['label'] ?? null),
                            'capacity_value' => $dataSize,
                            'capacity_unit' => 'GB',
                            'validity' => $item['validity'] ?? null,
                            'price' => (float) ($item['price'] ?? 0),
                            'currency' => 'GHS',
                            'active' => true,
                        ]
                    );

                    $synced++;
                }
            }

            Log::info("✅ iDATA sync complete — {$synced} packages synced.");

        } catch (\Throwable $e) {
            Log::error('🔥 SyncProductsFromSupplier Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}

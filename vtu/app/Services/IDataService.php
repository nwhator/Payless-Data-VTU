<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class IDataService
{
    protected string $baseUrl;
    protected ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.idata.base_url', 'https://idatagh.com/wp-json/custom/v1'), '/');
        $this->apiKey = config('services.idata.api_key');
    }

    public function headers(): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if (!empty($this->apiKey)) {
            $headers['Authorization'] = 'Bearer ' . $this->apiKey;
        }

        return $headers;
    }

    public function availableNetworks(): array
    {
        return ['mtn', 'telecel', 'airteltigo'];
    }

    public function walletBalance(): Response
    {
        return Http::withHeaders($this->headers())->get($this->url('/wallet-balance'));
    }

    public function packages(?string $network = null): Response
    {
        $query = [];

        if ($network !== null && $network !== '') {
            $query['network'] = $this->normalizeNetworkForSupplier($network);
        }

        return Http::withHeaders($this->headers())->get($this->url('/packages'), $query);
    }

    public function orderStatus(string|int $orderId): Response
    {
        return Http::withHeaders($this->headers())->get($this->url('/order-status'), [
            'order_id' => $orderId,
        ]);
    }

    public function placeOrder(string $network, string $beneficiary, int|float|string $package): Response
    {
        return Http::withHeaders($this->headers())->post($this->url('/place-order'), [
            'network' => $this->normalizeNetworkForSupplier($network),
            'beneficiary' => $beneficiary,
            'pa_data-bundle-packages' => $package,
        ]);
    }

    public function placeProductOrder(Product $product, string $beneficiary): Response
    {
        $network = $product->network;
        if (empty($network)) {
            $network = $this->extractNetworkFromName($product->name);
        }

        return $this->placeOrder(
            $this->normalizeNetworkForSupplier($network),
            $beneficiary,
            $this->packageValue($product)
        );
    }

    protected function extractNetworkFromName(string $name): string
    {
        $lower = strtolower(trim($name));
        if (str_contains($lower, 'mtn')) return 'MTN';
        if (str_contains($lower, 'airtel') || str_contains($lower, 'tigo')) return 'AirtelTigo';
        if (str_contains($lower, 'telecel') || str_contains($lower, 'vodafone') || str_contains($lower, 'telcel')) return 'Telecel';
        if (str_contains($lower, 'glo')) return 'Glo';
        return '';
    }

    public function normalizeNetworkForSupplier(?string $network): string
    {
        $net = strtolower(trim((string) $network));
        if (str_contains($net, 'mtn')) {
            return 'mtn';
        }
        if (str_contains($net, 'telecel') || str_contains($net, 'vodafone') || str_contains($net, 'telcel')) {
            return 'telecel';
        }
        if (str_contains($net, 'airtel') || str_contains($net, 'tigo') || str_contains($net, 'airteltigo')) {
            return 'airteltigo';
        }
        if (str_contains($net, 'glo')) {
            return 'glo';
        }
        return $net;
    }

    public function normalizeNetworkForProduct(?string $network): string
    {
        $net = strtolower(trim((string) $network));
        if (str_contains($net, 'mtn')) {
            return 'MTN';
        }
        if (str_contains($net, 'telecel') || str_contains($net, 'vodafone') || str_contains($net, 'telcel')) {
            return 'Telcel';
        }
        if (str_contains($net, 'airtel') || str_contains($net, 'tigo') || str_contains($net, 'airteltigo')) {
            return 'Airtel';
        }
        if (str_contains($net, 'glo')) {
            return 'Glo';
        }
        return trim((string) $network);
    }

    public function packageValue(Product $product): int|float|string
    {
        if ($product->capacity_value !== null && $product->capacity_value !== '') {
            return $product->capacity_value;
        }

        if (is_numeric($product->capacity)) {
            return $product->capacity + 0;
        }

        if (is_string($product->capacity) && preg_match('/\d+(?:\.\d+)?/', $product->capacity, $matches)) {
            return $matches[0] + 0;
        }

        return $product->product_code ?? $product->name;
    }

    public function normalizeOrderStatus(?string $status): string
    {
        $status = strtolower(trim((string) $status));

        return match ($status) {
            'success', 'successful', 'completed', 'complete', 'delivered' => 'completed',
            'failed', 'failure', 'cancelled', 'canceled', 'error' => 'failed',
            default => 'processing',
        };
    }

    protected function url(string $path): string
    {
        return $this->baseUrl . '/' . ltrim($path, '/');
    }
}
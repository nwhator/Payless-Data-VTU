<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductProxyController extends Controller
{
    /**
     * Get all active products from DB (with computed prices)
     */
    public function products(Request $request)
    {
        $products = Product::where('active', true)->get();

        $data = $products->map(function ($p) {
            $base = $p->price;

            //  Define fallback margins (if not set)
            $customerMargin = $p->customer_margin ?? ($base < 10 ? 1 : ($base < 20 ? 2 : ($base < 50 ? 4 : 6)));
            $agentMargin = $p->agent_margin ?? ($customerMargin * 0.8);

            //  Compute total prices
            $customerPrice = $base + $customerMargin;
            $agentPrice = $base + $agentMargin;

            //  Update DB (so total agent_price & customer_price stay correct)
            // Note: Do not overwrite admin-defined values if they exist
            if ($p->customer_price != $customerPrice || $p->agent_price != $agentPrice) {
                $p->updateQuietly([
                    'customer_price' => $customerPrice,
                    'agent_price' => $agentPrice,
                ]);
            }

            return [
                'id' => $p->id,
                'product_code' => $p->product_code,
                'name' => $p->name,
                'category' => $p->category,
                'capacity' => $p->capacity,
                'capacity_value' => $p->capacity_value,
                'capacity_unit' => $p->capacity_unit,
                'validity' => $p->validity,
                'currency' => $p->currency ?? 'GHS',
                'base_price' => $base,
                'customer_margin' => $customerMargin,
                'agent_margin' => $agentMargin,
                'customer_price' => $customerPrice,
                'agent_price' => $agentPrice,
                'profit_margin' => $customerMargin,
                'active' => $p->active,
            ];
        });

        return response()->json([
            'success' => true,
            'count' => $data->count(),
            'products' => $data,
        ]);
    }

    public function index()
    {
        $products = Product::where('active', true)->get()->map(function ($p) {
            $base = $p->price;
            $customerMargin = $p->customer_margin ?? ($base < 10 ? 1 : ($base < 20 ? 2 : ($base < 50 ? 4 : 6)));
            $agentMargin = $p->agent_margin ?? ($customerMargin * 0.8);

            $customerPrice = $base + $customerMargin;
            $agentPrice = $base + $agentMargin;

            //  Sync stored prices silently if they differ
            if ($p->customer_price != $customerPrice || $p->agent_price != $agentPrice) {
                $p->updateQuietly([
                    'customer_price' => $customerPrice,
                    'agent_price' => $agentPrice,
                ]);
            }

            return [
                'id' => $p->id,
                'name' => $p->name,
                'category' => $p->category,
                'capacity' => $p->capacity,
                'price' => $p->price,
                'currency' => $p->currency ?? 'GHS',
                'customer_margin' => $customerMargin,
                'agent_margin' => $agentMargin,
                'customer_price' => $customerPrice,
                'agent_price' => $agentPrice,
                'profit' => $customerMargin,
            ];
        });

        return response()->json([
            'success' => true,
            'products' => $products,
        ]);
    }


    /**
     *  Sync products from external supplier API into local DB
     * This does NOT overwrite admin margins.
     */
    public function syncSupplierProducts(Request $request)
    {
        $base = config('services.datamart.base') ?? env('DATAMART_API_BASE');
        $url = rtrim($base, '/') . '/products';

        try {
            $res = Http::withHeaders([
                'X-API-Key' => env('DATAMART_API_KEY'),
                'X-API-Secret' => env('DATAMART_API_SECRET'),
                'Accept' => 'application/json',
            ])->timeout(10)->get($url);

            if ($res->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Supplier error',
                    'detail' => $res->json(),
                ], 502);
            }

            $body = $res->json();
            $items = $body['data']['products'] ?? ($body['products'] ?? []);

            foreach ($items as $item) {
                Product::updateOrCreate(
                    ['product_code' => $item['product_code']],
                    [
                        'name' => $item['name'] ?? '',
                        'category' => $item['category'] ?? '',
                        'capacity' => $item['capacity'] ?? null,
                        'capacity_value' => $item['capacity_value'] ?? null,
                        'capacity_unit' => $item['capacity_unit'] ?? null,
                        'validity' => $item['validity'] ?? null,
                        'price' => $item['price'] ?? 0,
                        'currency' => $item['currency'] ?? 'GHS',
                        'active' => ($item['status'] ?? 'inactive') === 'active',
                        // 🧠 Do NOT touch customer_margin or agent_margin
                    ]
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Products synced successfully',
                'count' => count($items),
            ]);
        } catch (\Throwable $e) {
            Log::error('Product sync failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateMargin(Request $request, Product $product)
    {
        //  Validate inputs
        $data = $request->validate([
            'customer_margin' => 'nullable|numeric|min:0',
            'agent_margin' => 'nullable|numeric|min:0',
        ]);

        //  Get base price
        $base = $product->price;

        //  Determine final margins (use provided ones, or fallback to existing)
        $customerMargin = $data['customer_margin'] ?? $product->customer_margin ?? 0;
        $agentMargin = $data['agent_margin'] ?? $product->agent_margin ?? ($customerMargin * 0.8);

        //  Compute total prices
        $customerPrice = $base + $customerMargin;
        $agentPrice = $base + $agentMargin;

        //  Update everything in one go
        $product->update([
            'customer_margin' => $customerMargin,
            'agent_margin' => $agentMargin,
            'customer_price' => $customerPrice,
            'agent_price' => $agentPrice,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Margins and prices updated successfully.',
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'capacity' => $product->capacity,
                'price' => $product->price,
                'currency' => $product->currency ?? 'GHS',
                'customer_margin' => $customerMargin,
                'agent_margin' => $agentMargin,
                'customer_price' => $customerPrice,
                'agent_price' => $agentPrice,
            ],
        ]);
    }

}

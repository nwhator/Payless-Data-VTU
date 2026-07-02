<?php

namespace App\Http\Controllers;

use App\Jobs\SyncProductsFromSupplier;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    // Fetch latest from DB (after sync)
    public function fetchProducts()
    {
        $products = Product::where('active', true)->get();
        return response()->json([
            'success' => true,
            'count' => $products->count(),
            'data' => $products
        ]);
    }

    // Fetch capacities directly from supplier
    public function fetchCapacities()
    {
        try {
            $res = Http::withHeaders([
                'X-API-Key' => config('services.datamart.key'),
                'X-API-Secret' => config('services.datamart.secret'),
                'Content-Type' => 'application/json',
            ])->get(config('services.datamart.base') . '/v1/capacities');

            if ($res->failed()) {
                return response()->json(['success' => false, 'message' => 'Failed to fetch capacities'], 400);
            }

            return response()->json($res->json());
        } catch (\Throwable $e) {
            Log::error('Capacity fetch failed', ['message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    // Manually trigger background product sync
    public function syncProducts()
    {
        SyncProductsFromSupplier::dispatch();
        return response()->json(['success' => true, 'message' => 'Sync job dispatched']);
    }
}

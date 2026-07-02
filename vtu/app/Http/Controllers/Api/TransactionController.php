<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TransactionController extends Controller
{
    public function list(Request $request)
    {
        $params = $request->only(['status', 'start_date', 'end_date', 'page', 'limit']);
        try {
            $res = Http::withHeaders([
                'X-API-Key' => config('services.datamart.key'),
                'X-API-Secret' => config('services.datamart.secret'),
            ])->get(config('services.datamart.base') . '/v1/transactions', $params);

            return response()->json($res->json(), $res->status());
        } catch (\Throwable $e) {
            Log::error('Transaction list failed', ['message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    public function show($reference)
    {
        try {
            $res = Http::withHeaders([
                'X-API-Key' => config('services.datamart.key'),
                'X-API-Secret' => config('services.datamart.secret'),
            ])->get(config('services.datamart.base') . '/v1/transactions/' . $reference);

            return response()->json($res->json(), $res->status());
        } catch (\Throwable $e) {
            Log::error('Transaction detail failed', ['message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }
}

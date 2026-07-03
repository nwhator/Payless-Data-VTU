<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\IDataService;

class TransactionController extends Controller
{
    public function list(Request $request)
    {
        try {
            $res = app(IDataService::class)->walletBalance();

            return response()->json($res->json(), $res->status());
        } catch (\Throwable $e) {
            Log::error('Wallet balance lookup failed', ['message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    public function show($reference)
    {
        try {
            $res = app(IDataService::class)->orderStatus($reference);

            return response()->json($res->json(), $res->status());
        } catch (\Throwable $e) {
            Log::error('Order status lookup failed', ['message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }
}

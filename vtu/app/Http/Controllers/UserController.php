<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Wallet;
use App\Models\Order;
use App\Models\Transaction;
use Inertia\Inertia;
use App\Models\Product;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    /**
     * Display customer dashboard.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        /** @var \App\Models\User $user */ 
        $user = Auth::user();

        // Pre-load relationships and counts
        $user->load(['wallet'])
             ->loadCount(['orders', 'transactions']);

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
            
                'customer_margin' => $customerMargin,
                'agent_margin' => $agentMargin,
                'customer_price' => $customerPrice,
              
                'active' => $p->active,
            ];
        });

        $latestUpgrade = \App\Models\AgentUpgrade::where('user_id', $user->id)->latest()->first();

        return Inertia::render('customer/CustomerDashboard', [
            'auth' => [
                'user' => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                    'upgrade_status' => $latestUpgrade ? $latestUpgrade->status : null,
                ],
            ],
            'wallet' => [
                'balance' => $user->wallet->balance ?? 0.00,
            ],
            'totalPurchases'     => $user->orders_count,
            'totalTransactions'  => $user->transactions_count,
            'products' => $data,
        ]);
    }
    public function wallet(Request $request)
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = User::with(['wallet' => function ($q) {
            $q->select('user_id', 'balance');
        }])->find($userId);

        return response()->json([
            'wallet' => $user->wallet->balance ?? 0,
        ]);
    }


    public function indexAdmin(Request $request)
    {
        try {
            $users = User::select([
                'id',
                'name',
                'email',
                'role',
            ])
            // Eager load the 'wallet' relationship
            ->with(['wallet' => function ($query) {
                // Select only the fields needed by the frontend
                $query->select('user_id', 'balance', 'total_commissions');
            }])
            ->orderBy('id', 'desc')
            ->get();

            // --- Transform the data for the Frontend ---
            // Flatten the 'wallet' object into the main user object properties
            $transformedUsers = $users->map(function ($user) {
                $wallet = $user->wallet;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    // Frontend expects 'balance' and 'commission_earned'
                    'balance' => $wallet ? (float) $wallet->balance : 0.00,
                    'commission_earned' => $wallet ? (float) $wallet->total_commissions : 0.00,
                ];
            });

            return response()->json([
                'data' => $transformedUsers,
                'message' => 'Users fetched successfully.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error fetching admin users:', ['error' => $e->getMessage()]);

            return response()->json([
                'error' => 'Failed to load user data.',
                'message' => 'An error occurred while fetching users.'
            ], 500);
        }
    }

    /**
     * Display the successful purchase page for the authenticated customer.
     */
    public function purchaseSuccess(Request $request)
    {
        // 1. Authentication Check (Should be covered by middleware, but good defense)
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();
        
        // 2. Retrieve Flash Data
        $message = $request->session()->get('message', "Success! Your transaction was completed.");
        $orderId = $request->session()->get('order_id');
        
        // 3. Render View with Personalized Data
        return Inertia::render('payment/PurchaseSuccess', [
            'message' => $message,
            'userName' => $user->name, // Greeting
            'orderId' => $orderId,
            'isSuccess' => true,
        ]);
    }

    // ---

    /**
     * Display the failed purchase page for the authenticated customer.
     */
    public function purchaseFailed(Request $request)
    {
        // 1. Authentication Check
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        // 2. Retrieve Flash Data
        $error = $request->session()->get('error', "Payment was not completed or an error occurred.");
        
        // 3. Render View with Personalized Data
        return Inertia::render('payment/PurchaseFailed', [
            'errorMessage' => $error, // Use a clear variable name for the error message
            'userName' => $user->name,
            'isSuccess' => false,
        ]);
    }

    public function getOrders()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $orders = $user->orders()
            ->latest()
            ->limit(100)
            ->get();

        $orderTransactionIds = $orders
            ->pluck('transaction_id')
            ->filter()
            ->unique()
            ->values();

        $transactionsQuery = $user->transactions()
            ->with('product')
            ->latest()
            ->limit(100);

        if ($orderTransactionIds->isNotEmpty()) {
            $transactionsQuery->whereNotIn('id', $orderTransactionIds);
        }

        $orderRows = $orders->map(function ($order) {
                $amountVal = $order->amount !== null ? (float) $order->amount : 0.0;
                $fullAmount = ($order->currency ?? 'GHS') . ' ' . number_format($amountVal, 2);
                $status = $this->displayStatus($order->status);

                return [
                    'id' => 'order-' . $order->id,
                    'reference' => $order->reference ?? $order->payment_reference,
                    'source' => 'order',
                    'bundle' => "{$order->network} {$order->data_volume}",
                    'recipient' => $order->recipient ?? 'N/A',
                    'amount' => $fullAmount,
                    'paymentStatus' => $this->displayStatus($order->payment_status),
                    'status' => $status,
                    'statusColor' => $this->statusColor($status),
                    'date' => $order->created_at ? $order->created_at->format('M d, Y') : '',
                    'time' => $order->created_at ? $order->created_at->format('h:i A') : '',
                    'created_at' => $order->created_at ? $order->created_at->toIso8601String() : '',
                ];
            });

        $transactionRows = $transactionsQuery->get()->map(function ($transaction) {
            $meta = $transaction->meta ?? [];
            $recipient = $meta['recipient_number'] ?? $meta['beneficiary_number'] ?? 'N/A';
            $productName = $transaction->product?->name ?? $transaction->description ?? ucfirst($transaction->type);
            $dataVolume = $transaction->product?->capacity ?? '';
            $status = $this->displayStatus($transaction->status);
            $reference = $transaction->paystack_ref ?? $transaction->reference;

            $amountVal = $transaction->amount !== null ? (float) $transaction->amount : 0.0;

            return [
                'id' => 'txn-' . $transaction->id,
                'reference' => $reference,
                'source' => 'transaction',
                'bundle' => trim("{$productName} {$dataVolume}"),
                'recipient' => $recipient,
                'amount' => ($transaction->currency ?? 'GHS') . ' ' . number_format($amountVal, 2),
                'paymentStatus' => $status,
                'status' => $status,
                'statusColor' => $this->statusColor($status),
                'date' => $transaction->created_at ? $transaction->created_at->format('M d, Y') : '',
                'time' => $transaction->created_at ? $transaction->created_at->format('h:i A') : '',
                'created_at' => $transaction->created_at ? $transaction->created_at->toIso8601String() : '',
            ];
        });

        $orders = $orderRows
            ->concat($transactionRows)
            ->sortByDesc('created_at')
            ->values();

        return response()->json(['orders' => $orders]);
    }

    private function displayStatus(?string $status): string
    {
        $status = strtolower((string) $status);

        return match ($status) {
            'success', 'successful', 'completed', 'paid' => 'Successful',
            'failed', 'error', 'declined', 'abandoned', 'reversed' => 'Failed',
            'processing' => 'Processing',
            default => 'Pending',
        };
    }

    private function statusColor(string $status): string
    {
        return match ($status) {
            'Successful' => 'text-green-400',
            'Failed' => 'text-red-400',
            'Processing' => 'text-blue-400',
            default => 'text-yellow-400',
        };
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var User $customer */
        $customer = Auth::user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users')->ignore($customer->id)],
            'password' => ['nullable', 'confirmed', 'min:8'],
        ]);

        $customer->name = $validated['name'];
        $customer->email = $validated['email'];

        if (!empty($validated['password'])) {
            $customer->password = Hash::make($validated['password']);
        }

        $customer->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'user' => $customer, // Optional: send updated user back for SPA state update
        ], 200);
    }

     /**
     * Delete the user's account.
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'status' => 'success',
            'message' => 'Account deleted successfully.',
            'redirect' => '/', // Optional: frontend can read this and navigate
        ], 200);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        //  Return a simple JSON success message.
        return response()->json([
            'message' => 'Logged out successfully.'
        ], 200);
    }

}

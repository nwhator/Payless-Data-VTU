<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Product;
use App\Models\AgentProductPrice;
use App\Models\Order;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Facades\Http;

class AgentController extends Controller
{
    /**
     * Fetch all active products with agent-specific overrides.
     * Returns:
     * - admin base agent price
     * - agent's custom added amount
     * - agent's final price (base + added)
     * - profit = added amount
     */
    public function products()
    {
        $agent = Auth::user();

        $products = Product::where('active', true)
            ->get()
            ->map(function ($p) use ($agent) {
                // Admin’s base price for agents
                $adminAgentPrice = $p->agent_price ?? 0;

                // Find agent-specific record
                $custom = AgentProductPrice::where('agent_id', $agent->id)
                    ->where('product_id', $p->id)
                    ->first();

                $added = $custom?->added_amount ?? 0;
                $finalPrice = $custom?->agent_price ?? 0;

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'capacity' => $p->capacity,
                    'admin_agent_price' => $adminAgentPrice,
                    'added_amount' => $added,
                    'agent_price' => $finalPrice,
                    'profit' => $added,
                ];
            });

        return response()->json([
            'success' => true,
            'products' => $products,
        ]);
    }

    /**
     * Update or set agent's custom added amount for a product.
     * Request: { added_amount: number }
     */
    public function updateMargin(Request $request, Product $product)
    {
        $agent = Auth::user();

        $data = $request->validate([
            'added_amount' => 'required|numeric|min:0',
        ]);

        // Admin base price for agents
        $adminPrice = $product->agent_price ?? 0;

        // Final selling price = base + agent added
        $finalPrice = $adminPrice + $data['added_amount'];

        // Store or update the agent's override
        AgentProductPrice::updateOrCreate(
            [
                'agent_id' => $agent->id,
                'product_id' => $product->id,
            ],
            [
                'added_amount' => $data['added_amount'],
                'agent_price' => $finalPrice,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Agent price updated successfully',
            'id' => $product->id,
            'name' => $product->name,
            'capacity' => $product->capacity,
            'admin_agent_price' => $adminPrice,
            'added_amount' => $data['added_amount'],
            'agent_price' => $finalPrice,
            'profit' => $data['added_amount'],
        ]);
    }

    public function overview()
    {
        try {
            $agent = Auth::user();
            $agentId = $agent->id;

            // --- 1. Agent's Personal Stats (Wallet and Own Purchases) ---
            
            // FIX: Use optional chaining (?->) to safely access wallet properties.
            // This prevents "Trying to get property 'balance' of non-object" if $agent->wallet is null.
            $walletBalance = $agent->wallet?->balance ?? 0.0;
            $totalCommissions = $agent->wallet?->total_commissions ?? 0.0;
            
            // Count transactions where the agent is the direct user (their own consumption).
            $agentOwnPurchasesCount = Transaction::where('user_id', $agentId)
                ->where('type', 'agent_purchase')
                ->count();
            
            // --- 2. Agent's Store Sales Stats (Orders from the store link) ---
            
            // Define a base query for successful sales from the agent's store.
            $successfulStoreSalesQuery = Order::query()
            ->where('agent_id', $agentId)
            ->where('payment_status', 'success')
            // FIX 1: Rely only on the JSON success flag from the vendor response, as per the user's request/log.
            ->where(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(vendor_response, '$.success'))"), 'true');

            // 2a. Total Sales (Revenue) from the store
            // Use ?? 0.0 to guarantee a numeric value (float) even if sum returns null (e.g., no orders)
            $totalSalesRevenue = $successfulStoreSalesQuery->sum('amount') ?? 0.0;
            
            // 2b. Total Number of Sales (Orders) from the store
            $totalSalesCount = $successfulStoreSalesQuery->count();
            
            // --- 3. Other stats ---
            // Use ?? 0.0 to guarantee a numeric value (float) even if sum returns null (e.g., no pending requests)
            $pendingWithdrawals = WithdrawalRequest::where('user_id', $agentId)
                ->where('status', 'pending')
                ->sum('amount') ?? 0.0;

            $apiStatus = $this->checkApiStatus() ? 'Active' : 'Inactive';
            

            // --- 4. Return Response ---
            // All values are now guaranteed to be numeric before casting
            return response()->json([
                'success' => true,
                'stats' => [
                    'walletBalance'          => (float) $walletBalance,
                    'totalCommissions'       => (float) $totalCommissions, 
                    
                    // Sales metrics based on successful/fulfilled store orders
                    'totalSales'        => (float) $totalSalesRevenue,
                    
                    // Purchases made by the agent for their own use
                    'totalPurchases' => (int) $totalSalesCount, 
                    
                    'pendingWithdrawals'     => (float) $pendingWithdrawals,
                    'apiStatus'              => $apiStatus,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Agent overview error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to load overview',
            ], 500);
        }
    }


    /**
     * Optionally check if your VTU API or service is up.
     * You can return true by default or make a quick ping.
     */
    private function checkApiStatus(): bool
    {
        try {
            // Example: Ping your VTU or Paystack endpoint if needed.
            // $response = Http::timeout(3)->get('https://api.yourvtu.com/ping');
            // return $response->ok();

            return true; // default active for now
        } catch (\Exception $e) {
            return false;
        }
    }

    // public function index(Request $request)
    // {
    //     // 1. Get the current agent's ID
    //     $agentId = Auth::id();
        
    //     // 2. Define the base query for orders belonging to this agent's store
    //     $query = Order::query()
    //         ->where('agent_id', $agentId) // Ensure only agent's own orders are queried
    //         ->fromStore() // Use the scope you defined to restrict to store orders
    //         ->withCasts(['data_volume' => 'float']) // Ensure data_volume is treated as float for JSON output
    //         ->orderBy('created_at', 'desc');

    //     // 3. Apply Filters
    //     $orders = $query->filter([
    //         'date_filter' => $request->get('date_filter'),
    //         'search' => $request->get('search'),
    //         'status' => $request->get('status'),
    //         'network' => $request->get('network'),
    //         // Note: payment_status is not used in the UI but could be added here if needed
    //     ]);

    //     // 4. Apply Pagination
    //     $perPage = $request->get('per_page', 50); // Use 50 as default if not specified
        
    //     $paginatedOrders = $orders->paginate($perPage)->withQueryString();

    //     // 5. Transform the paginated response for the frontend
    //     return response()->json([
    //         'success' => true,
    //         'orders' => [
    //             'data' => $paginatedOrders->items(), // The order data
    //             'meta' => [
    //                 'current_page' => $paginatedOrders->currentPage(),
    //                 'last_page' => $paginatedOrders->lastPage(),
    //                 'per_page' => $paginatedOrders->perPage(),
    //                 'total' => $paginatedOrders->total(),
    //                 // Add other useful pagination links/meta if needed
    //             ],
    //         ],
    //     ]);
    // }
    
    public function index(Request $request)
{
    // 1. Get the current agent's ID
    $agentId = Auth::id();

    // 2. TEMPORARY BASE QUERY: Filter by agent_id AND strictly enforce the vendor_response success flag.
    $query = Order::query()
        ->where('agent_id', $agentId)
        
        // Only include orders where the vendor has reported a successful transaction.
        // This is the condition that was causing the perceived filtering in your previous tests.
        ->where(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(vendor_response, '$.success'))"), 'true')
        
        ->orderBy('created_at', 'desc');

    // 3. Apply Pagination
    $perPage = $request->get('per_page', 50);
    
    // Paginate the results of the simplified query
    $paginatedOrders = $query->paginate($perPage)->withQueryString();

    // 4. Return the paginated response
    return response()->json([
        'success' => true,
        'orders' => [
            'data' => $paginatedOrders->items(), // The order data
            'meta' => [
                'current_page' => $paginatedOrders->currentPage(),
                'last_page' => $paginatedOrders->lastPage(),
                'per_page' => $paginatedOrders->perPage(),
                'total' => $paginatedOrders->total(),
            ],
        ],
    ]);
}

    public function updateProfile(Request $request)
    {
        /** @var User $agent */   //
        $agent = Auth::user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users')->ignore($agent->id)],
            'password' => ['nullable', 'confirmed', 'min:8'],
        ]);

        $agent->name = $validated['name'];
        $agent->email = $validated['email'];

        if (!empty($validated['password'])) {
            $agent->password = Hash::make($validated['password']);
        }

        $agent->save();

        return back()->with('success', 'Profile updated successfully.');
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

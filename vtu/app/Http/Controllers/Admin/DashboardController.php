<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AgentUpgrade;
use App\Models\Transaction;
use Inertia\Inertia;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Commission;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Handles the smart search logic for the Admin panel.
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request)
    {
        $searchTerm = trim($request->get('search'));
        $perPage = (int) $request->get('per_page', 10); // Changed default to 10 to match frontend
        $currentPage = (int) $request->get('page', 1);

        // --- Default Response Components ---
        $ordersData = ['data' => [], 'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => $perPage, 'total' => 0]];
        $smartMessage = null; // Will hold specific feedback for Agent/Customer/No Match

        // --- 1. HANDLE NO SEARCH TERM ---
        if (empty($searchTerm)) {
            // The frontend is now configured to NOT call the API without a search term (apiSearchTerm === null),
            // but this is a safety fallback for direct API calls.
            return response()->json([
                'success' => true,
                'message' => 'No search term provided. Awaiting explicit search.',
                'orders' => $ordersData,
                'smart_message' => null
            ]);
        }

        // --- 2. SMART SEARCH PRE-CHECK (Agent/Customer Name) ---
        // Attempt to find a user (Agent or Customer) by the search term
        $user = User::where(DB::raw('LOWER(name)'), strtolower($searchTerm))
                    // Assuming you might also want to search by email/phone for users
                    // ->orWhere('email', 'like', $searchTerm . '%')
                    ->first(); 
        
        // Check if the search term matches a User name
        if ($user) {
            
            // Assuming your User model has a method/property to determine if they are an agent
            // E.g., a 'role' column, or checking if their 'type' is 'agent'.
            $isAgent = $user->role === 'agent' || $user->type === 'agent'; 
            
            if ($isAgent) {
                // --- A. Search Term is an AGENT Name ---
                
                // Fetch orders associated with this agent
                $query = Order::query()
                    ->where('agent_id', $user->id) // Filter by agent's ID
                    ->select('orders.*') // Don't need the join/alias as we know the agent
                    ->fromStore() 
                    ->withCasts(['data_volume' => 'float']) 
                    ->orderBy('orders.created_at', 'desc');

                $orders = $query->paginate($perPage, ['*'], 'page', $currentPage);
                
                $ordersData = [
                    'data' => $orders->items(),
                    'meta' => [
                        'current_page' => $orders->currentPage(),
                        'last_page' => $orders->lastPage(),
                        'per_page' => $orders->perPage(),
                        'total' => $orders->total(),
                    ],
                ];

                if ($orders->total() > 0) {
                    $smartMessage = "Displaying **{$orders->total()}** order(s) for Agent: **{$user->name}**.";
                } else {
                    $smartMessage = "Agent **{$user->name}** has **no orders** yet in this store.";
                }

            } else {
                // --- B. Search Term is a CUSTOMER Name (User but not Agent) ---
                
                // Assuming customer transactions are tracked directly against the 'recipient' field in the Order table,
                // or you have a separate 'customer' table linked. For simplicity, we search 'recipient'.
                $query = Order::query()
                    ->where('recipient', 'like', "%{$user->phone_number}%") // Assuming customer phone is the recipient identifier
                    ->orWhere('recipient', 'like', "%{$user->email}%")
                    ->fromStore() 
                    ->withCasts(['data_volume' => 'float']) 
                    ->orderBy('orders.created_at', 'desc');

                $orders = $query->paginate($perPage, ['*'], 'page', $currentPage);

                $ordersData = [
                    'data' => $orders->items(),
                    'meta' => [
                        'current_page' => $orders->currentPage(),
                        'last_page' => $orders->lastPage(),
                        'per_page' => $orders->perPage(),
                        'total' => $orders->total(),
                    ],
                ];

                if ($orders->total() > 0) {
                    $smartMessage = "Displaying **{$orders->total()}** transaction(s) for Customer: **{$user->name}**.";
                } else {
                    $smartMessage = "Customer **{$user->name}** has **not purchased anything** yet.";
                }
            }
            
        } else {
            // --- 3. STANDARD/FALLBACK SEARCH (Order #, Recipient, Network) ---
            
            // If the search term is NOT a recognized Agent or Customer name, 
            // perform the general search across order fields (Reference, Recipient, Network).
            
            $query = Order::query()
                ->join('users', 'orders.agent_id', '=', 'users.id')
                ->select('orders.*', 'users.name as agent_name')
                ->fromStore()
                ->withCasts(['data_volume' => 'float'])
                ->orderBy('orders.created_at', 'desc');
            
            // Apply a strict WHERE clause for the search term across order fields
            $query->where(function ($q) use ($searchTerm) {
                // Search by Order Reference
                $q->where('orders.reference', 'like', "%{$searchTerm}%")
                  // Search by Recipient (e.g., phone number)
                  ->orWhere('orders.recipient', 'like', "%{$searchTerm}%")
                  // Search by Network
                  ->orWhere(DB::raw('LOWER(orders.network)'), 'like', '%' . strtolower($searchTerm) . '%');
            });
            
            $orders = $query->paginate($perPage, ['*'], 'page', $currentPage);

            $ordersData = [
                'data' => $orders->items(),
                'meta' => [
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                    'per_page' => $orders->perPage(),
                    'total' => $orders->total(),
                ],
            ];
            
            if ($orders->total() > 0) {
                 $smartMessage = "Found **{$orders->total()}** result(s) matching **'{$searchTerm}'** in Order Reference/Recipient/Network.";
            } else {
                 $smartMessage = "No results found for **'{$searchTerm}'** in Order References, Recipients, or Networks.";
            }

        }

        // --- 4. Return Final Response ---
        return response()->json([
            'success' => true,
            'message' => 'Smart search completed.', // General success message
            'orders' => $ordersData,
            'smart_message' => $smartMessage // The detailed feedback message
        ]);
    }

    public function index()
    {
        // Fetch basic stats
        $totalUsers = User::where('role', 'customer')->count();
        $totalAgents = User::where('role', 'agent')->count();
        $pendingUpgrades = AgentUpgrade::where('status', 'pending')->count();

        // Sample numbers (replace with real sales/profit logic later)
        $totalSales = 1258;
        $totalProfit = 15456.20;
        $apiStatus = 'Active';

        // Pull pending requests (with user relation)
        $pendingRequests = AgentUpgrade::with('user')
            ->where('status', 'pending')
            ->latest()
            ->get();

        // Pull products
        $products = Product::where('active', true)->get();

        return Inertia::render('admin/AdminDashboard', [
            'stats' => [
                'totalUsers' => $totalUsers,
                'totalAgents' => $totalAgents,
                'pendingUpgrades' => $pendingUpgrades,
                'totalSales' => $totalSales,
                'totalProfit' => $totalProfit,
                'apiStatus' => $apiStatus,
            ],
            'pendingRequests' => $pendingRequests,
            'products' => $products,
            'margins' => [
                'global_markup_ghs' => 0,
                'agent_discount_pct' => 0,
                'custom_margins' => [],
            ],
        ]);
    }

    /**
     * Calculates summary data for the Admin Dashboard.
     * * @return \Illuminate\Http\JsonResponse
     */
    public function getSummaryData()
    {
        // 1. Fetch User Metrics
        $totalUsers = User::count();
        $totalAgents = User::where('role', 'agent')->count();
        $pendingUpgrades = AgentUpgrade::where('status', 'pending')->count();
        
        // 2. Fetch Financial Metrics
        $totalSales = Transaction::where('status', 'successful')->count();

        // ---------------------------------------------------------------
        // 3. CORRECTED ADMIN NET PROFIT CALCULATION
        //    We join to the 'products' table to get the true vendor cost (products.price)
        //    and calculate Admin Profit as (Admin Revenue - True Vendor Cost).
        // ---------------------------------------------------------------
        
        $successfulStoreSalesQuery = Order::query()
            ->where('payment_status', 'success')
            // FIX 1: Rely only on the JSON success flag from the vendor response, as per the user's request/log.
            ->where(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(vendor_response, '$.success'))"), 'true');
        $totalSalesCount = $successfulStoreSalesQuery->count();

        $financials = Commission::query()
            ->join('products', 'commissions.product_id', '=', 'products.id')
            ->where('commissions.status', 'earned') 
            ->select(
                // Admin Revenue: What the Agent paid the platform
                DB::raw('SUM(commissions.sell_price) as total_revenue'),
                
                // True Vendor Cost: What the platform paid the vendor
                DB::raw('SUM(products.price) as total_vendor_cost'), 
                
                // Agent Markup: What the Agent kept
                DB::raw('SUM(commissions.profit) as total_agent_markup') 
            )
            ->first();
            
        // Log::info('Raw Financials Result (Joined):', $financials->toArray());

        $totalRevenue = (float) $financials->total_revenue ?? 0.00;
        $totalVendorCost = (float) $financials->total_vendor_cost ?? 0.00;
        $totalAgentMarkup = (float) $financials->total_agent_markup ?? 0.00;

        // FIX: Admin Net Profit = Admin Revenue - True Vendor Cost
        $totalAdminNetProfit = round(
            $totalRevenue - $totalVendorCost, 
            2
        );

        // Log::debug('Admin Net Profit Calculation Components (Final):', [
        //     'Total Admin Revenue (Agent Price)' => $totalRevenue,
        //     'Total True Vendor Cost (Product Price)' => $totalVendorCost,
        //     'Total Agent Markup (Agent Profit)' => $totalAgentMarkup,
        //     'Final Admin Net Profit' => $totalAdminNetProfit,
        // ]);


        // 4. Mock API Status
        $apiStatus = 'Active'; 

        $pendingRequests = AgentUpgrade::with('user')
            ->where('status', 'pending')
            ->latest()
            ->get();

        return Response::json([
            'totalUsers' => $totalUsers,
            'totalAgents' => $totalAgents,
            'pendingUpgrades' => $pendingUpgrades,
            'pendingRequests' => $pendingRequests,
            'totalSales' => $totalSalesCount,
            'totalProfit' => $totalAdminNetProfit, 
            'apiStatus' => $apiStatus,
            'totalRevenue' => $totalRevenue,
            'totalAgentMarkup' => $totalAgentMarkup, 
            'salesTrends' => [],
            'profitPerNetwork' => [],
        ]);
    }
    
    /**
     * Fetch orders for the Admin Dashboard Table.
     * Route: GET /admin/orders
     */
    public function order()
    {
        // 1. Build the Query based on your snippet
        $query = Order::query()
            ->with('user') // Eager load the User model to get 'agent_name'
            ->latest();    // Order by created_at desc

        // --- YOUR SPECIFIC FILTER LOGIC ---
        // Note: This logic forces the table to ONLY show successful orders.
        // If you want the table to show Pending/Failed orders as well, 
        // you should comment out these two 'where' clauses.
        $query->where('payment_status', 'success')
              ->where(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(vendor_response, '$.success'))"), 'true');
        // ----------------------------------

        // Limit results to prevent browser crash on massive datasets since we are doing client-side search
        $orders = $query->limit(1000)->get();

        // 2. Transform the data to match the React Frontend 'Order' interface
        $formattedOrders = $orders->map(function ($order) {
            return [
                'id'             => $order->id,
                'reference'      => $order->reference, // or $order->trx_ref
                
                // Handle case where user might be deleted or null
                'agent_name'     => $order->user ? $order->user->name : 'Guest / System', 
                
                'created_at'     => $order->created_at->toIso8601String(),
                
                // Adjust these column names to match your actual DB columns
                'network'        => $order->network_name ?? $order->network, // e.g., 'MTN', 'AirtelTigo'
                'recipient'      => $order->phone_number ?? $order->recipient,
                'data_volume'    => $order->bundle_name ?? $order->amount . 'GB', // e.g. '2GB'
                'amount'         => (float) $order->amount,
                
                // Statuses for the badge colors
                'payment_status' => $order->payment_status, // 'Paid', 'Pending', etc.
                'status'         => $order->status,         // 'Completed', 'Processing', 'Failed'
            ];
        });

        // 3. Return as JSON array
        return response()->json($formattedOrders);
    }

    /**
     * Update Order Status (for the "Mark as Completed" button)
     * Route: PUT /admin/orders/{id}/status
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        
        $order->update([
            'status' => $request->status // e.g., 'Completed'
        ]);

        return response()->json(['message' => 'Order updated successfully']);
    }
}


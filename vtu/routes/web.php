<?php

use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Admin\AgentUpgradeController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Admin\WallettController;
use App\Http\Controllers\Api\VTUController;
use App\Http\Controllers\Api\ProductProxyController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Admin\AuthhController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\WithdrawalRequestController;
use App\Http\Controllers\PaystackController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\AgentController;
use App\Http\Controllers\AgentStoreController;
// use App\Http\Controllers\DatamartWebhookController;
use App\Http\Controllers\Agent\AgentWalletController;
use App\Http\Controllers\Agent\PaystackAgentsController;
use App\Http\Controllers\PaystackFundController;
use App\Http\Controllers\Auth\ModalRegisterController;
use App\Http\Controllers\AgentPaymentController;
use App\Http\Middleware\VerifyCsrfToken;
use App\Http\Controllers\AgentPurchaseController;

Route::get('/', function () {
    if (Auth::check()) {
        return match (Auth::user()->role) {
            'admin'    => redirect()->route('admin.dashboard'),
            'agent'    => redirect()->route('agent.dashboard'),
            'customer' => redirect()->route('customer.dashboard'),
            default    => redirect()->route('login'),
        };
    }

    return Inertia::render('auth/login');
})->name('home');

Route::middleware(['auth', 'role:customer'])->group(function () {
    Route::get('/dashboard/customer', [UserController::class, 'index'])
        ->name('customer.dashboard');

    Route::get('/customer/api/orders', [UserController::class, 'getOrders'])
        ->name('customer.orders');

    Route::put('/user/api/profile', [UserController::class, 'updateProfile'])
        ->name('customer.update');

    Route::delete('/user/api/account', [UserController::class, 'destroy'])
        ->name('customer.delete');

    Route::post('/customer/upgrade/initialize', [AgentPaymentController::class, 'initializeCustomerUpgrade'])
    ->name('paystack.customer.upgrade.initialize');

    Route::post('/customer/logout', [UserController::class, 'logout'])->name('customer.logout');
    
});

Route::get('/refresh-token', function () {
    return response()->noContent();
})->middleware('web');

Route::post('/register/modal', [ModalRegisterController::class, 'store'])
    ->middleware('guest')
    ->name('register.modal');

// (Keep your existing ModalLoginController route)
Route::post('/login/modal', [ModalRegisterController::class, 'login'])
    ->middleware('guest')
    ->name('login.modal');

// Paystack Routes
Route::post('/paystack/initialize', [PaystackController::class, 'initialize'])->name('paystack.initialize');
Route::get('/paystack/callback', [PaystackController::class, 'callback'])->name('paystack.purchase.callback');
Route::get('/payment/success', function () {
    return Inertia::render('payment/success');
})->name('payment.success');
Route::post('/paystack/main-initialize', [PaystackController::class, 'initializeMainPurchase'])->middleware('auth')->name('paystack.guest.initialize');
Route::get('/paystack/main-callback', [PaystackController::class, 'mainPurchaseCallback'])->name('paystack.main.callback');
// ---  Customer Fund Wallet Flow ---
Route::post('/paystack/customer/fund/initialize', [PaystackFundController::class, 'initializeCustomerFund'])
    ->middleware('auth') // Ensure user is authenticated
    ->name('paystack.customer.fund.initialize');

// ---  Customer Fund Wallet Callback ---
Route::get('/paystack/customer/fund/callback', [PaystackFundController::class, 'customerFundCallback'])
    ->name('paystack.customer.fund.callback');


Route::get('/paystack/upgrade/callback', [AgentPaymentController::class, 'callbackCustomerUpgrade'])
    ->name('paystack.customer.upgrade.callback');

Route::get('/dashboard/upgrade', function () {
    return Inertia::render('UpgradeStatus');
})->middleware(['auth'])->name('dashboard.upgrade.status');
    


// Success page for authenticated customers
Route::get('/purchase/success', [UserController::class, 'purchaseSuccess'])->middleware('auth')->name('purchase.success');

// Failed page for authenticated customers
Route::get('/purchase/failed', [UserController::class, 'purchaseFailed'])->middleware('auth')->name('purchase.failed');

Route::get('/payment/failed', function () {
    return Inertia::render('payment/failed');
})->name('payment.failed');

// The public callback route (already confirmed as correct):
Route::get('/paystack/agent-fund-callback', [PaystackAgentsController::class, 'callback'])->name('paystack.agent.callback');


Route::get('/api/wallet', [UserController::class, 'wallet']);
Route::post('/logout', [UserController::class, 'logout'])->name('user.logout');
// Route::get('/api/customer/dashboard-data', [UserController::class, 'purchaseSuccess'])->middleware('auth')->name('dashboard.data');

Route::get('/admin', [AuthhController::class, 'showLogin'])->name('admin.login');
Route::post('/admin/login', [AuthhController::class, 'login'])->name('admin.login.post');


// Protected admin routes
Route::middleware(['auth', 'admin'])->prefix('admin')->group(function () {
    //  Use DashboardController for real data instead of static render
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');

    Route::get('/dashboard/summary', [DashboardController::class, 'getSummaryData'])->name('admin.summary');

    Route::get('/orders', [DashboardController::class, 'order'])->name('admin.orders');
    Route::get('/transactions', [DashboardController::class, 'transactions'])->name('admin.transactions');
    Route::get('/agents', [DashboardController::class, 'agents'])->name('admin.agents');
    Route::put('/orders/{id}/status', [DashboardController::class, 'updateStatus']);

    Route::get('/users', [UserController::class, 'indexAdmin']);

    Route::get('/profile', function () {
        return Inertia::render('admin/profile');
    })->name('admin.profile');

    Route::post('/logout', [AuthhController::class, 'logout'])->name('admin.logout');

    Route::post('/profile/update', [AuthhController::class, 'updateProfile']);

    Route::get('/agent-requests', [AgentUpgradeController::class, 'index'])->name('admin.agent.requests');
    Route::post('/agent-requests/{id}/approve', [AgentUpgradeController::class, 'approve']);
    Route::post('/agent-requests/{id}/decline', [AgentUpgradeController::class, 'decline']);

    Route::post('/products/{product}/update-margin', [ProductProxyController::class, 'updateMargin'])->name('admin.products.updateMargin');

    Route::post('/products/sync', [ProductProxyController::class, 'syncSupplierProducts'])->name('admin.products.sync');
    Route::get('/products', [ProductProxyController::class, 'index']);

    Route::get('/wallets', [WallettController::class, 'index'])->name('admin.wallets');
    Route::post('/wallet/update', [WallettController::class, 'updateUserWallet'])->name('admin.wallets.update');

    Route::get('/withdrawals', [WithdrawalRequestController::class, 'index']);
    Route::post('/withdrawals/{id}/approve', [WithdrawalRequestController::class, 'approve']);
    Route::post('/withdrawals/{id}/decline', [WithdrawalRequestController::class, 'decline']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    //  Admin-assisted purchase (admin buys for agent or customer)
    Route::post('/purchase', [PurchaseController::class, 'adminStore'])->name('purchase.admin');
});




Route::get('/paystack/verify', [WalletController::class, 'verifyPaystack']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/api/logout', [AuthController::class, 'logout']);

    Route::get('/wallet', [WalletController::class, 'balance']);
    Route::post('/wallet/paystack', [WalletController::class, 'initializePaystack']);

    Route::post('/vtu/topup', [VTUController::class, 'topup']);
});

Route::get('/api/v1/products', [ProductProxyController::class, 'products']);
Route::post('/api/v1/products/sync', [ProductProxyController::class, 'syncSupplierProducts']);

/*
|--------------------------------------------------------------------------
| Purchase Routes (Admin, Agent, Customer)
|--------------------------------------------------------------------------
|
| These routes handle all data purchase actions — single, bulk, and admin-assisted.
| All are protected with auth middleware so only logged-in users can access them.
|
*/

Route::middleware(['auth', 'agent', 'role:agent'])->group(function () {

    Route::get('/agent/dashboard', function () {
        return Inertia::render('agent/dashboard');
    })->name('agent.dashboard');

    Route::post('/agent/logout', [AgentController::class, 'logout'])->name('agent.logout');

    Route::post('/agent/profile/update', [AgentController::class, 'updateProfile']);

    //  Regular customer or agent single purchase
    Route::post('/purchase/single', [PurchaseController::class, 'purchaseSingle'])
        ->name('purchase.single');

    //  Bulk purchase (for agents or advanced users)
    Route::post('/purchase/bulk', [PurchaseController::class, 'purchaseBulk'])
        ->name('purchase.bulk');

    //  Check status of a transaction (all users)
    Route::get('/purchase/status/{reference}', [PurchaseController::class, 'checkStatus'])
        ->name('purchase.status');

    Route::get('/agent/products', [AgentController::class, 'products']);
    Route::post('/agent/products/{product}/update-margin', [AgentController::class, 'updateMargin']);

    Route::get('/agent/overview', [AgentController::class, 'overview']);

    Route::get('/agent/store', [AgentStoreController::class, 'show']);
    Route::post('/agent/store', [AgentStoreController::class, 'update']); // handles create/update with multipart
    Route::post('/agent/store/publish', [AgentStoreController::class, 'publish']);
    Route::post('/agent/store/unpublish', [AgentStoreController::class, 'unpublish']);
    Route::get('/agent/store/check-slug', [AgentStoreController::class, 'checkSlug']);
    Route::post('/agent/gen/generate-banner', [AgentStoreController::class, 'generateBanner']); // new
    Route::delete('/agent/store/{store}', [AgentStoreController::class, 'destroy']);
    Route::get('/agent/orders', [AgentController::class, 'index'])->name('agent.orders.index');

    // GET /agent/notifications (Fetches the list of announcements for the agent)
    Route::get('/agent/notifications', [NotificationController::class, 'getAgentNotifications']); 
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    // 1. COMMISSION/WALLET STATS (GET /api/wallet/stats)
    Route::get('/wallet/stats', [AgentWalletController::class, 'getStats']); // Used by your component's summary boxes

    // 2. COMMISSION EARNINGS HISTORY (GET /api/commissions)
    Route::get('/commissions', [AgentWalletController::class, 'getCommissionHistory']); // Used by your commission history table

    // 3. WITHDRAWAL HISTORY (GET /api/withdrawals)
    Route::get('/withdrawals', [AgentWalletController::class, 'getWithdrawalHistory']); // Used by your withdrawal history table

    // 4. SUBMIT WITHDRAWAL REQUEST (POST /api/withdraw)
    Route::post('/withdraw', [AgentWalletController::class, 'submitWithdrawalRequest']); // Used by your withdrawal form

    // --- Inside your authenticated agent routes group ---
    Route::post('/agent/paystack/fund/initialize', [PaystackAgentsController::class, 'initializeFund'])->name('agent.paystack.initialize');
    
    // Agent purchase initialization (wallet-first with fee fallback)
    Route::post('/agent/purchase/initialize', [AgentPurchaseController::class, 'initializeSingle'])
        ->name('agent.purchase.initialize');
    
    // Agent bulk purchase (if you want to implement this)
    Route::post('/agent/purchase/bulk', [AgentPurchaseController::class, 'initializeBulk'])
        ->name('agent.purchase.bulk');

});

// Paystack callback for agent purchases (no auth middleware needed)
Route::get('/agent/purchase/callback', [AgentPurchaseController::class, 'handleCallback'])
    ->name('agent.purchase.callback');

// Route::post('/datamart/webhook', [DatamartWebhookController::class, 'handle']);

// Route::post('/api/datamart/webhook', [DatamartWebhookController::class, 'handle'])
//     ->name('datamart.webhook')
//     ->withoutMiddleware([
//         VerifyCsrfToken::class, // Explicitly tell Laravel to skip CSRF for this POST request
//     ]);

// Public (no auth)
Route::get('/store/{slug}', [AgentStoreController::class, 'publicStore'])->name('stores.public');

// Public store purchase (no auth)
Route::post('/store/{slug}/order', [PurchaseController::class, 'publicStorePurchase'])
    ->name('store.public.order');

Route::post('/purchase', [PurchaseController::class, 'purchaseSingle'])
    ->name('purchasee.single');


require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

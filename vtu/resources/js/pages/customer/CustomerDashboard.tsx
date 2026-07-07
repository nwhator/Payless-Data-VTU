import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import axios from "axios";

import Sidebar from "@/components/Customer/Sidebar";
import Navbar from "@/components/Customer/Navbar";
import CustomerSummary from "@/components/Customer/CustomerSummary";
import CustomerPurchases from "@/components/Customer/CustomerPurchases";
import CustomerProfile from "@/components/Customer/CustomerProfile";
import AgentUpgrade from "@/components/Customer/AgentUpgrade";
import SupportCenter from "@/components/Customer/SupportCenter";

import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import PurchaseFormModal from "@/components/Customer/PurchaseFormModal";

/* -----------------------------------
   TYPES
------------------------------------ */

// Existing Types
interface Product {
  id: number;
  name: string;
  product_code: string;
  category: string;
  currency: string;
  active: boolean;
  capacity: string;
  capacity_value: number;
  capacity_unit: string;
  validity: string;
  agent_margin: number;
  customer_margin: number;
  customer_price: number;
}

interface CustomerUser {
  id: number;
  name: string;
  email: string;
  role: "customer" | "agent";
}

interface WalletData {
  balance: number;
}

interface PageProps {
  auth: { user: CustomerUser };
  wallet: WalletData;
  totalPurchases: number;
  products?: Product[];
  [key: string]: unknown;
}

// NEW ORDER TYPE (must match the structure returned by your backend getOrders API)
interface Order {
  id: string;
  reference: string;
  source: string;
  bundle: string; // e.g., "MTN 2GB"
  recipient: string; // e.g., "054xxxxxxx"
  amount: string; // e.g., "GHS 12.50"
  paymentStatus: string;
  status: string; // e.g., "SUCCESS"
  statusColor: string; // e.g., "text-green-400"
  date: string; // e.g., "Nov 14, 2025"
  time: string; // e.g., "06:50 PM"
}

/* -----------------------------------
   HELPERS
------------------------------------ */

const getMetaContent = (active: string, name: string) => {
  const lower = active.toLowerCase();

  const metaMap: Record<string, { title: string; description: string }> = {
    overview: {
      title: `${name}'s Portal | Dashboard Overview`,
      description: "Your dashboard summary, wallet balance & purchases.",
    },
    purchases: {
      title: `${name}'s Portal | Purchases`,
      description: "Your bundle purchase history.",
    },
    profile: {
      title: `${name}'s Portal | Profile`,
      description: "Update your personal information.",
    },
    upgrade: {
      title: `${name}'s Portal | Become an Agent`,
      description: "Upgrade to agent for GHS 20.",
    },
    support: {
      title: `${name}'s Portal | Support`,
      description: "Support and help center.",
    },
  };

  return metaMap[lower] || {
    title: `${name}'s Portal`,
    description: "Manage your account.",
  };
};

const formatName = (name: string) =>
  name ? name.split(" ")[0].replace(/^\w/, (c) => c.toUpperCase()) : "Customer";

/* -----------------------------------
   MAIN COMPONENT
------------------------------------ */

export default function CustomerDashboard() {
  const { props, url } = usePage<PageProps>();

  /* ---------------- STATE ---------------- */
  const [user, setUser] = useState(props.auth.user);
  const [wallet, setWallet] = useState(props.wallet);
  const [totalPurchases, setTotalPurchases] = useState(props.totalPurchases);

  const [products, setProducts] = useState<Product[]>(props.products ?? []);
  const [productsLoading, setProductsLoading] = useState(false);

  const [active, setActive] = useState(
    localStorage.getItem("cd:active") || "overview"
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false); // Global loading state for API/tab switch

  // NEW STATE for Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false); // Prevents refetching

  // purchase modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  /* ---------------- URL PARAMS (ALERT HANDLING) ---------------- */
  const searchParams = useMemo(
    () => new URLSearchParams(url.split("?")[1]),
    [url]
  );

  const callbackStatus = searchParams.get("status");
  const callbackMessage = searchParams.get("message");
  const showAlert = !!callbackStatus;

  const CUSTOMER_NAME = formatName(user.name);
  const meta = getMetaContent(active, CUSTOMER_NAME);

  /* ---------------- FETCH ORDERS HANDLER ---------------- */
  const fetchOrders = useCallback(async () => {
    if (ordersLoaded) return; // Only fetch once per session

    try {
      setLoading(true);
      // **Use the API endpoint you created on the backend**
      const response = await axios.get("/customer/api/orders"); 
      setOrders(response.data.orders);
      setOrdersLoaded(true);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [ordersLoaded]);


  /* ---------------- CHANGE ACTIVE TAB ---------------- */
  const handleSetActive = useCallback(
    async (key: string) => {
      setActive(key);
      localStorage.setItem("cd:active", key);
      setSidebarOpen(false);

      // remove ?status messages
      if (showAlert) {
        router.get(url.split("?")[0], {}, { replace: true });
      }

      setLoading(true);

      // --- LOGIC TO FETCH ORDERS ONLY WHEN SWITCHING TO 'purchases' ---
      if (key === "purchases") {
        await fetchOrders();
      }

      setLoading(false);
    },
    [showAlert, url, fetchOrders]
  );

  /* ---------------- BODY LOCK (SIDEBAR) ---------------- */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
  }, [sidebarOpen]);
  
  // Initial load check (if user lands directly on /purchases)
  useEffect(() => {
    if (active === 'purchases' && !ordersLoaded) {
        fetchOrders();
    }
  }, [active, ordersLoaded, fetchOrders]);


  /* ---------------- ALERT SCREEN ---------------- */
  if (showAlert && callbackMessage) {
    const decoded = decodeURIComponent(callbackMessage);
    const success = callbackStatus === "success";

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1C24] p-6">
        <div
          className={`p-8 rounded-xl border max-w-lg w-full ${
            success
              ? "border-green-500 bg-green-500/10 text-green-200"
              : "border-red-500 bg-red-500/10 text-red-300"
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            {success ? (
              <CheckCircle size={40} className="text-green-400" />
            ) : (
              <XCircle size={40} className="text-red-400" />
            )}

            <h2 className="text-xl font-bold">
              {success ? "Transaction Successful!" : "Transaction Failed!"}
            </h2>

            <p className="text-center">{decoded}</p>

            <Button
              className="mt-4 w-full max-w-xs bg-white text-black"
              onClick={() =>
                router.get(url.split("?")[0], {}, { replace: true })
              }
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN VIEW ---------------- */
  return (
    <>
      <Head title={meta.title}>
        <meta name="description" content={meta.description} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#0B1C24] text-white flex">
        <Sidebar
          active={active}
          setActive={handleSetActive}
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 lg:ml-64 transition-all duration-300">
          <Navbar
            active={active}
            customerName={CUSTOMER_NAME}
            onMenuClick={() => setSidebarOpen((p) => !p)}
            setActive={handleSetActive}
          />

          <main className="p-6">
            {active === "overview" && (
              <CustomerSummary
                user={user}
                wallet={wallet}
                totalPurchases={totalPurchases}
                products={products}
                loadingProducts={productsLoading}
                onSetActive={handleSetActive}
                onProductClick={(product) => {
                  setSelectedProduct(product);
                  setShowPurchaseModal(true);
                }}
              />
            )}

            {/* UPDATED: Pass loading and orders to CustomerPurchases */}
            {active === "purchases" && (
                <CustomerPurchases 
                    loading={loading} 
                    orders={orders} 
                />
            )}

            {active === "profile" && (
              <CustomerProfile
                user={user}
                
              />
            )}

            {active === "upgrade" && (
              <AgentUpgrade upgradeFee={20} user={user} />
            )}

            {active === "support" && <SupportCenter />}

            {/* PURCHASE FORM MODAL */}
            {showPurchaseModal && selectedProduct && (
              <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4">
                <div className="bg-[#00121A] rounded-xl w-full max-w-md">
                  <PurchaseFormModal
                    product={selectedProduct}
                    user={user}
                    onClose={() => setShowPurchaseModal(false)}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

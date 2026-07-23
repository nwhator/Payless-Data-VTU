import React, { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import {
    DollarSign,
    ListChecks,
    TrendingUp,
    User,
    Clock,
    Wifi,
    X,
    Copy,
    Share2,
    Eye,
    Search,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

// --- NEW INTERFACES ---
interface AgentStats {
    walletBalance: number
    totalPurchases: number
    totalSales: number
    totalCommissions: number
    pendingWithdrawals: number
    apiStatus: string
}

interface AgentSummaryProps {
    setActive: (s: string) => void
}

interface StoreData {
    store_name: string
    store_slug: string
    publish: string
}

interface Order {
    id: number
    reference: string
    created_at: string // ISO string
    network: string
    recipient: string
    data_volume: number
    amount: number
    currency: string
    payment_status: string
    status: string
}

interface PaginationMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
}

interface OrderFilters {
    date: string
    searchTerm: string
    status: string
    network: string
    page: number
    perPage: number
}
// --- END NEW INTERFACES ---

// --- NEW CONSTANTS FOR FILTERS ---
const DATE_FILTERS = [
    { key: "all", label: "All Dates" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
]

const STATUS_OPTIONS = [
    { key: "all", label: "All Status" },
    { key: "pending", label: "Pending" },
    { key: "processing", label: "Processing" },
    { key: "completed", label: "Completed" },
    { key: "canceled", label: "Canceled" },
]

const NETWORK_OPTIONS = [
    { key: "all_networks", label: "All Networks" },
    { key: "MTN", label: "MTN" },
    { key: "AirtelTigo", label: "AirtelTigo" },
    { key: "Telecel", label: "Telecel" },
]

const PER_PAGE_OPTIONS = [5, 10, 20, 50, 100]
// --- END NEW CONSTANTS ---

// Helper function to format date
const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

// Helper function to capitalize and format strings
const formatStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")

const AgentSummary: React.FC<AgentSummaryProps> = ({ setActive }) => {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<AgentStats | null>(null)
    const [store, setStore] = useState<StoreData | null>(null)
    const [showShareModal, setShowShareModal] = useState(false)

    // --- NEW ORDER STATE ---
    const [orders, setOrders] = useState<Order[]>([])
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [pagination, setPagination] = useState<PaginationMeta>({
        current_page: 1,
        last_page: 1,
        per_page: 5,
        total: 0,
    })
    const [filters, setFilters] = useState<OrderFilters>({
        date: "all",
        searchTerm: "",
        status: "all",
        network: "all_networks",
        page: 1,
        perPage: 50,
    })

    // --- NEW: FETCH ORDERS LOGIC (Callback depends only on filters) ---
    const fetchOrders = useCallback(async () => {
        setOrdersLoading(true)

        // Build query parameters
        const params = {
            page: filters.page,
            per_page: filters.perPage,
            date_filter: filters.date !== "all" ? filters.date : undefined,
            search: filters.searchTerm || undefined,
            status: filters.status !== "all" ? filters.status : undefined,
            network: filters.network !== "all_networks" ? filters.network : undefined,
        }

        try {
            const { data } = await axios.get("/agent/orders", { params })
            if (data.success) {
                setOrders(data.orders.data || [])
                setPagination(data.orders.meta || {
                    current_page: 1,
                    last_page: 1,
                    per_page: filters.perPage,
                    total: 0,
                })
            } else {
                toast.error(data.message || "⚠️ Failed to load orders")
            }
        } catch (_error) {
            console.error("Orders fetch failed:", _error)
            toast.error("⚠️ Network or server error loading orders")
        } finally {
            setOrdersLoading(false)
        }
    }, [filters])
    // --- END FETCH ORDERS LOGIC ---


    // Fetch overview + store info (Runs once)
    useEffect(() => {
        const fetchOverview = async () => {
            // Set both loading states to true initially
            setLoading(true);

            try {
                // Use Promise.all to fetch both simultaneously
                const [overviewRes, storeRes] = await Promise.all([
                    axios.get("/agent/overview").catch(err => ({ data: { success: false, message: "Overview network error" }, status: err.response?.status })),
                    axios.get("/agent/store").catch(err => ({ data: { success: false, message: "Store network error" }, status: err.response?.status })),
                ]);

                const overviewData = overviewRes.data;
                const storeData = storeRes.data;

                let overviewSuccess = true;

                // 1. Handle Overview Response
                if (overviewData.success && overviewData.stats) {
                    setStats(overviewData.stats);
                } else if (overviewData.message) {
                    // Show toast for explicit server-side failure messages
                    toast.error(overviewData.message); 
                    overviewSuccess = false;
                } else {
                    // Catch unexpected failures that still returned a response
                    toast.error("⚠️ Failed to load metrics summary.");
                    overviewSuccess = false;
                }

                // 2. Handle Store Response
                if (storeData.success && storeData.store) {
                    setStore(storeData.store);
                } else if (storeRes.status === 404) {
                    // If 404 for store (store not created), it's often normal, just set null
                    setStore(null);
                } else if (!storeData.success && storeData.message) {
                    // If there's an explicit error message for the store call
                    toast.warning(`Store info error: ${storeData.message}`);
                }


                if (!overviewSuccess) {
                    // If the main stats failed, prevent page load and show error
                }

            } catch (error) {
                // This catches catastrophic network failures or misconfigured axios
                console.error("Initial fetch catastrophic error:", error);
                toast.error("🚨 Catastrophic network error loading initial data.");
            } finally {
                setLoading(false);
            }
        }

        fetchOverview();
    }, [])

    // FIX: Effect to refetch orders whenever filters change. 
    // We remove the internal 'if' check that was blocking updates.
    useEffect(() => {
        fetchOrders()
    }, [filters.date, filters.searchTerm, filters.status, filters.network, filters.page, filters.perPage, fetchOrders])

    const handleFilterChange = (key: keyof OrderFilters, value: string | number) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value }
            // If date, search, status, or network changes, reset page to 1
            if (key !== 'page' && key !== 'perPage') {
                newFilters.page = 1
            }
            return newFilters
        })
    }

    const storeExists = !!store
    const storeUrl = store ? `${window.location.origin}/store/${store.store_slug}` : ""

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
                <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-3">Loading summary...</p>
            </div>
        )
    }

    const metricCards = [
        {
            title: "Wallet Balance",
            value: `GHS ${stats.walletBalance.toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-400",
            linkKey: "wallet",
        },
        {
            title: "Total Purchases",
            value: stats.totalPurchases,
            icon: ListChecks,
            color: "text-blue-400",
            linkKey: "purchases",
        },
        {
            title: "Total Sales",
            value: `GHS ${stats.totalSales.toFixed(2)}`,
            icon: TrendingUp,
            color: "text-yellow-400",
            linkKey: "store",
        },
        {
            title: "Total Commissions",
            value: `GHS ${stats.totalCommissions.toFixed(2)}`,
            icon: User,
            color: "text-purple-400",
            linkKey: "commissions",
        },
        {
            title: "Pending Withdrawals",
            value: `GHS ${stats.pendingWithdrawals.toFixed(2)}`,
            icon: Clock,
            color: "text-red-400",
            linkKey: "wallet",
        },
        {
            title: "API Status",
            value: stats.apiStatus,
            icon: Wifi,
            color: stats.apiStatus === "Active" ? "text-green-400" : "text-red-400",
            linkKey: "support",
        },
    ]

    const copyToClipboard = () => {
        // Use document.execCommand('copy') for better compatibility in iFrames
        if (storeUrl) {
            const el = document.createElement('textarea');
            el.value = storeUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            toast.success("Store link copied to clipboard ✅");
        }
    }

    // --- Order View Components ---

    const OrdersFilterBar = () => (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/50 rounded-lg mb-4">
            {/* Left side filters (Date, Status, Network) */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Date Filter */}
                <select
                    value={filters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="bg-slate-700/50 text-white rounded-lg p-2 text-sm border border-slate-700 focus:ring-green-400 focus:border-green-400"
                >
                    {DATE_FILTERS.map((f) => (
                        <option key={f.key} value={f.key}>
                            {f.label}
                        </option>
                    ))}
                </select>

                {/* Status Filter */}
                <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="bg-slate-700/50 text-white rounded-lg p-2 text-sm border border-slate-700 focus:ring-green-400 focus:border-green-400"
                >
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s.key} value={s.key}>
                            {s.label}
                        </option>
                    ))}
                </select>

                {/* Network Filter */}
                <select
                    value={filters.network}
                    onChange={(e) => handleFilterChange('network', e.target.value)}
                    className="bg-slate-700/50 text-white rounded-lg p-2 text-sm border border-slate-700 focus:ring-green-400 focus:border-green-400"
                >
                    {NETWORK_OPTIONS.map((n) => (
                        <option key={n.key} value={n.key}>
                            {n.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Right side search and per page */}
            <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search Phone..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                        className="bg-slate-700/50 text-white rounded-lg p-2 pl-9 text-sm border border-slate-700 focus:ring-green-400 focus:border-green-400 transition-all w-full sm:w-48"
                    />
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>

                {/* Per Page */}
                <select
                    value={filters.perPage}
                    onChange={(e) => handleFilterChange('perPage', Number(e.target.value))}
                    className="bg-slate-700/50 text-white rounded-lg p-2 text-sm border border-slate-700 focus:ring-green-400 focus:border-green-400"
                >
                    {PER_PAGE_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                            {p} Per Page
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )

    const OrdersTable = () => {
        const getStatusColor = (status: string) => {
            switch (status.toLowerCase()) {
                case "completed": return "bg-green-600/20 text-green-400";
                case "pending": return "bg-yellow-600/20 text-yellow-400";
                case "processing": return "bg-blue-600/20 text-blue-400";
                case "canceled": return "bg-red-600/20 text-red-400";
                default: return "bg-slate-600/20 text-slate-400";
            }
        }

        const handleViewAction = (order: Order) => {
            // In a real application, this would open a modal with order details.
            // For now, we'll use a toast notification.
            toast.info(`Viewing Order #${order.reference}. ID: ${order.id}`)
        }

        if (ordersLoading) {
            return (
                <div className="flex items-center justify-center h-40 text-slate-400">
                    <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="ml-3">Fetching orders...</p>
                </div>
            )
        }

        if (orders.length === 0) {
            return (
                <div className="p-10 text-center text-slate-400 bg-white/5 rounded-lg">
                    No orders found matching the current filters.
                </div>
            )
        }

        return (
            <div className="shadow-md rounded-lg">
                {/* 1. MOBILE (CARD VIEW) - Hidden on medium+ screens */}
                <div className="lg:hidden space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white/5 border border-white/10 p-4 rounded-lg shadow-md transition hover:bg-white/10">
                            {/* Row 1: Reference and Date */}
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                                <span className="text-sm text-slate-400">Order # / Date</span>
                                <div className="text-right">
                                    <strong className="text-white text-base">{order.reference}</strong>
                                    <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                                </div>
                            </div>

                            {/* Row 2: Recipient and Network */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-slate-400">Recipient / Network</span>
                                <span className="text-white text-right">
                                    **{order.recipient}** <br />
                                    <span className="text-xs text-slate-400">({order.network})</span>
                                </span>
                            </div>

                            {/* Row 3: Amount and Data */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-slate-400">Amount / Data</span>
                                <span className="text-right">
                                    <strong className="text-yellow-400">GH₵ {order.amount.toFixed(2)}</strong> <br />
                                    <span className="text-xs text-slate-400">{order.data_volume} GB</span>
                                </span>
                            </div>

                            {/* Row 4: Statuses and Actions */}
                            <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-3">
                                <div className="flex flex-col space-y-1">
                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${getStatusColor(order.status)}`}>
                                        {formatStatus(order.status)}
                                    </span>
                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${getStatusColor(order.payment_status)}`}>
                                        {formatStatus(order.payment_status)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleViewAction(order)}
                                    className="text-[#00C4FF] hover:text-[#33d8ff] transition p-2 rounded-full bg-white/5"
                                    title="View Order Details"
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>


                {/* 2. DESKTOP (TABLE VIEW) - Hidden on small screens */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs text-white uppercase bg-slate-800/80 sticky top-0">
                            <tr>
                                <th scope="col" className="py-3 px-6">Order #</th>
                                <th scope="col" className="py-3 px-6">Date</th>
                                <th scope="col" className="py-3 px-6">Network</th>
                                <th scope="col" className="py-3 px-6">Recipient</th>
                                <th scope="col" className="py-3 px-6 text-right">Data (GB)</th>
                                <th scope="col" className="py-3 px-6 text-right">Amount (GHS)</th>
                                <th scope="col" className="py-3 px-6">Payment Status</th>
                                <th scope="col" className="py-3 px-6">Status</th>
                                <th scope="col" className="py-3 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="bg-white/5 border-b border-white/10 hover:bg-white/10 transition">
                                    <th scope="row" className="py-4 px-6 font-medium text-white whitespace-nowrap">
                                        {order.reference}
                                    </th>
                                    <td className="py-4 px-6">{formatDate(order.created_at)}</td>
                                    <td className="py-4 px-6">{order.network}</td>
                                    <td className="py-4 px-6">{order.recipient}</td>
                                    <td className="py-4 px-6 text-right font-mono">{order.data_volume}</td>
                                    <td className="py-4 px-6 text-right font-bold text-yellow-400">GH₵ {order.amount.toFixed(2)}</td>
                                    <td className="py-4 px-6">
                                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${getStatusColor(order.payment_status)}`}>
                                            {formatStatus(order.payment_status)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${getStatusColor(order.status)}`}>
                                            {formatStatus(order.status)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <button
                                            onClick={() => handleViewAction(order)}
                                            className="text-[#00C4FF] hover:text-[#33d8ff] transition"
                                            title="View Order Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    const OrdersPagination = () => (
        <div className="flex justify-between items-center mt-4 p-4 bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-400">
                Showing **{(pagination.current_page - 1) * pagination.per_page + 1}** to **{Math.min(pagination.current_page * pagination.per_page, pagination.total)}** of **{pagination.total}** results
            </p>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => handleFilterChange('page', filters.page - 1)}
                    disabled={filters.page === 1}
                    className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 transition"
                    title="Previous Page"
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-semibold">
                    Page {filters.page} of {pagination.last_page}
                </span>
                <button
                    onClick={() => handleFilterChange('page', filters.page + 1)}
                    disabled={filters.page === pagination.last_page}
                    className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 transition"
                    title="Next Page"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    )

    // --- End Order View Components ---

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

            {/* Store Banner */}
            {!storeExists ? (
                <div className="bg-green-700/80 p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold">Create Your Store</h3>
                        <p className="text-sm text-green-100">
                            Personalize your link and share with customers.
                        </p>
                    </div>
                    <button
                        onClick={() => setActive("store")}
                        className="w-full sm:w-auto bg-white text-green-700 px-6 py-2 rounded-lg font-semibold hover:bg-green-50 transition text-center"
                    >
                        Create Now
                    </button>
                </div>
            ) : (
                <div className="bg-green-700/80 p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold">Share Your Store</h3>
                        <p className="text-sm text-green-100">Secure and customizable store URL</p>
                    </div>
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="w-full sm:w-auto bg-white text-green-700 px-6 py-2 rounded-lg font-semibold hover:bg-green-50 transition text-center"
                    >
                        Share Now
                    </button>
                </div>
            )}

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && storeExists && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-white relative"
                        >
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-2xl font-bold mb-2">Share Your Store</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Copy your link or share directly to platforms
                            </p>

                            <div className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                                <span className="truncate">{storeUrl}</span>
                                <button
                                    onClick={copyToClipboard}
                                    className="text-green-400 hover:text-green-300"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>

                            <div className="flex justify-center gap-6 mt-6">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(storeUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-green-500 hover:bg-green-600 p-3 rounded-full"
                                >
                                    <Share2 size={20} />
                                </a>
                                <a
                                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(storeUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-500 hover:bg-blue-600 p-3 rounded-full"
                                >
                                    <Share2 size={20} />
                                </a>
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-700 hover:bg-blue-800 p-3 rounded-full"
                                >
                                    <Share2 size={20} />
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* --- NEW: WHATSAPP GROUP BANNER --- */}
            <a
                href="https://chat.whatsapp.com/LUXbNXeS5r77Ga20bvhTWR"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-green-500/20 border border-green-400/50 hover:bg-green-500/30 transition-all duration-300 group shadow-lg"
            >
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 448 512" 
                    className="w-6 h-6 shrink-0 text-green-400" 
                    fill="currentColor"
                >
                    <path d="M380.9 97.1C339.4 55.4 283.4 32 224 32C128.1 32 49.6 109.9 49.6 205.9c0 37.1 11.4 72.8 33.1 103.1L32 447.9l112.5-29.6c27.1 14.8 57.7 22.6 88.5 22.6h.1c95.9 0 174.5-77.6 174.5-173.6c0-48.4-19.6-94.2-56-130.6zM224 415.9c-28.5 0-57.1-7.8-82.5-22.6l-1.8-1l-18.7 5l5.1-18.2l-1.1-1.8c-21.7-30.3-33.1-66-33.1-103.1c0-79 63.5-143.2 142.3-143.2s142.3 64.2 142.3 143.2c0 78.9-63.5 143.2-142.3 143.2zm61.2-110.1c-3.7-1.8-22-10.9-25.4-12.1s-5.9-1.8-8.5 1.8c-2.6 3.7-9.8 12.1-12 14.6s-4.5 2.7-8.2 1.2c-3.7-1.5-15.6-5.8-29.6-18.2c-10.9-9.7-18.2-24.3-20.4-28c-2.2-3.7-.2-5.7 1.6-7.5s3.7-4.5 5.5-6.7c1.8-2.2 2.5-4.1 3.7-6.2s.6-4.1-.2-5.7c-1.8-1.5-8.2-19.6-11.2-26.9c-3-7.3-6.2-6.4-8.5-6.4s-4.5-.2-6.9-.2c-2.4-.2-6.2.8-9.5 4.5s-12.1 12-12.1 29.3c0 17.3 12.4 33.9 14.2 36.6s24.4 37.5 59.2 52.8c34.8 15.3 43.7 12.3 49 11.5s17-4.1 19.4-8c2.4-3.9 2.4-7.3 1.7-8.5c-.8-1.2-3.1-1.8-6.9-3.7z"/>
                </svg>
                <span className="font-semibold text-white text-sm sm:text-base flex-1">
                    Join Our Official WhatsApp Community
                </span>
                <ChevronRight className="w-5 h-5 shrink-0 text-green-400 group-hover:translate-x-1 transition" />
            </a>
            {/* --- END NEW: WHATSAPP GROUP BANNER --- */}

            <h2 className="text-3xl font-bold">Your Business Overview</h2>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {metricCards.map((card, i) => (
                    <motion.div
                        key={i}
                        onClick={() => setActive(card.linkKey)}
                        className="p-6 rounded-xl border border-white/10 shadow-xl cursor-pointer hover:bg-white/5 transition duration-150"
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className={`flex items-center justify-between mb-3 ${card.color}`}>
                            <card.icon size={28} />
                        </div>
                        <p className="text-sm text-slate-400">{card.title}</p>
                        <p className="text-2xl font-extrabold text-white mt-1">{card.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* --- REPLACED CHARTS WITH ORDERS TABLE --- */}
            <h3 className="text-xl font-semibold pt-4 flex items-center gap-2">
                <ListChecks size={20} className="text-green-400" /> Recent Store Orders
            </h3>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
                <OrdersFilterBar />
                <OrdersTable />
                {pagination.total > 0 && <OrdersPagination />}
            </div>
            {/* --- END ORDERS TABLE --- */}

        </motion.div>
    )
}

export default AgentSummary
import React, { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Users, User, ListChecks, DollarSign, Wifi, Clock, X, Loader2 } from "lucide-react"
import axios from "axios"
import { toast } from "sonner" 

// OrdersTable MUST be imported and used - ENSURE THIS PATH IS CORRECT
import OrdersTable from './OrdersTable' 

// --- 1. Define Data Structure for Live Data ---
interface SummaryData {
    totalUsers: number
    totalAgents: number
    pendingUpgrades: number
    totalSales: number
    totalProfit: number
    apiStatus: "Active" | "Inactive"
}

// --- 2. Component Props Update ---
interface DashboardSummaryProps {
    setActive: (s: string) => void
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ setActive }) => {
    // --- 3. State for Live Data and Loading ---
    const [data, setData] = useState<SummaryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // --- 4. Data Fetching Effect ---
    useEffect(() => {
        const fetchSummaryData = async () => {
            setLoading(true)
            setError(null)
            try {
                const response = await axios.get<SummaryData>("/admin/dashboard/summary") 
                setData(response.data)
            } catch (err) {
                console.error("Failed to fetch dashboard summary:", err)
                const msg =
                    axios.isAxiosError(err) && err.response?.data?.message 
                    ? err.response.data.message 
                    : "Failed to load dashboard metrics. Please try again.";
                setError(msg)
                toast.error("Dashboard data failed to load.")
                setData(null);
            } finally {
                setLoading(false)
            }
        }

        fetchSummaryData()
    }, []) // Dependency array is empty for a one-time fetch on mount

    // --- 5. Dynamic Metric Card Definition (using fetched data) ---
    const metricCards = useMemo(() => {
        if (!data) return [];

        const { totalUsers, totalAgents, totalSales, totalProfit, apiStatus, pendingUpgrades } = data;

        return [
            { title: "Total Users", value: totalUsers, icon: Users, color: "text-blue-400", linkKey: "users" },
            { title: "Total Agents", value: totalAgents, icon: User, color: "text-indigo-400", linkKey: "users" },
            { title: "Total Sales", value: totalSales, icon: ListChecks, color: "text-yellow-400", linkKey: "transactions" },
            { 
                title: "Total Profit (Est.)", 
                // Type casting totalProfit to ensure toFixed works, though it should be number from API
                value: `GHS ${Number(totalProfit).toFixed(2)}`, 
                icon: DollarSign, 
                color: "text-green-400", 
                linkKey: "pricing" 
            },
            { 
                title: "API Sync Status", 
                value: apiStatus, 
                icon: Wifi, 
                color: apiStatus === "Active" ? "text-green-400" : "text-red-400", 
                linkKey: "api" 
            },
            { title: "Pending Agent Upgrades", value: pendingUpgrades, icon: Clock, color: "text-red-400", linkKey: "requests" },
        ];
    }, [data])


    // --- 6. Loading/Error State Render ---
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-white/70">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                Loading system metrics...
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-900/30 p-4 rounded-xl text-red-300 border border-red-700/50">
                <p className="font-semibold">{error}</p>
            </div>
        )
    }

    // --- 7. Main Render (using live data) ---
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            // FIX: Tailwind classes added for screen optimization (w-full and overflow-x-hidden)
            className="space-y-8 w-full overflow-x-hidden"
        >
            <h2 className="text-3xl font-bold">System Overview</h2>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {metricCards.map((card, i) => (
                    <motion.div
                        key={i}
                        onClick={() => setActive(card.linkKey)}
                        className={`p-6 rounded-xl border border-white/10 shadow-xl cursor-pointer hover:bg-white/5 transition duration-150`}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className={`flex items-center justify-between mb-3 ${card.color}`}>
                            <card.icon size={28} />
                            {card.value === "Inactive" && <X size={20} />}
                        </div>
                        <p className="text-sm text-slate-400">{card.title}</p>
                        <p className="text-2xl font-extrabold text-white mt-1">{card.value}</p>
                    </motion.div>
                ))}
            </div>
            
            <hr className="border-white/10 my-8" />

            {/* Orders Table */}
            <h3 className="text-2xl font-bold">Recent Transactions</h3>
            
            <>
              <OrdersTable />
            </>

        </motion.div>

         
    )
}

export default DashboardSummary
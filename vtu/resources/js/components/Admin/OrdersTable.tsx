import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Truck,
  Loader2,
  Search,
  XCircle as XCircleIcon,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// --- TYPE DEFINITIONS ---
interface Order {
  id: number;
  reference: string;
  agent_name: string;
  created_at: string;
  network: string;
  recipient: string;
  data_volume: string;
  amount: number;
  payment_status: string;
  status: string;
}

// --- HELPER FUNCTIONS ---
const getStatusBadge = (status: Order["status"]) => {
  switch (status) {
    case "Completed":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-green-900/50 text-green-300 rounded-full flex items-center gap-1 w-fit">
          <CheckCircle size={12} /> Completed
        </span>
      );
    case "Processing":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded-full flex items-center gap-1 w-fit">
          <Clock size={12} /> Processing
        </span>
      );
    case "Failed":
    case "Refunded":
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-red-900/50 text-red-300 rounded-full flex items-center gap-1 w-fit">
          <XCircleIcon size={12} /> {status}
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-gray-600/50 text-gray-300 rounded-full w-fit">
          {status}
        </span>
      );
  }
};

const getPaymentStatusIcon = (status: Order["payment_status"]) => {
  if (status === "Paid" || status === "success") return <CheckCircle size={16} className="text-green-400" />;
  if (status === "Pending") return <Clock size={16} className="text-yellow-400" />;
  return <XCircleIcon size={16} className="text-red-400" />;
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// --- MAIN COMPONENT ---

const OrdersTable: React.FC = () => {
  // State for data
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Stores the full fetched list
  const [loading, setLoading] = useState(true);
  
  // State for Client-Side Search
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for processing actions (prevents double clicking)
  const [processingId, setProcessingId] = useState<number | null>(null);

  // 1. FETCH ALL ORDERS ON MOUNT
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Changed to a simple GET request that should return the list
        const response = await axios.get("/admin/orders"); 
        
        // Adjust this based on your exact API response structure.
        // If your API returns { data: [...] }, use response.data.data
        const data = Array.isArray(response.data) ? response.data : response.data.orders?.data || [];
        
        setAllOrders(data);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load transaction history.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // 2. CLIENT-SIDE FILTERING LOGIC
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return allOrders;

    const lowerTerm = searchTerm.toLowerCase();

    return allOrders.filter((order) => {
      return (
        order.reference.toLowerCase().includes(lowerTerm) ||
        order.agent_name.toLowerCase().includes(lowerTerm) ||
        order.recipient.toLowerCase().includes(lowerTerm) ||
        order.network.toLowerCase().includes(lowerTerm)
      );
    });
  }, [searchTerm, allOrders]);


  // 3. ACTION: MARK AS COMPLETED
  const markAsCompleted = async (orderId: number) => {
    if(!confirm("Are you sure you want to mark this order as Completed manually?")) return;
    
    setProcessingId(orderId);
    try {
      // Adjust endpoint to your backend logic
      await axios.put(`/admin/orders/${orderId}/status`, { status: "Completed" });
      
      toast.success("Order marked as completed!");

      // OPTIMISTIC UPDATE: Update local state immediately without refetching
      setAllOrders((prev) => 
        prev.map((o) => o.id === orderId ? { ...o, status: "Completed" } : o)
      );

    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  // --- RENDER ---

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 w-full"
    >
      {/* SEARCH BAR (Instant) */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-lg transition-all"
          placeholder="Instant search by Agent, Ref, or Number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
           <button 
             onClick={() => setSearchTerm("")}
             className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
           >
             <XCircleIcon size={18} />
           </button>
        )}
      </div>

      {/* TABLE CONTAINER */}
      <div className="shadow-2xl rounded-xl bg-slate-900/50 border border-slate-700/50 overflow-hidden w-full">
        
        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            Loading transactions...
          </div>
        ) : filteredOrders.length === 0 ? (
          // Empty State
          <div className="flex flex-col justify-center items-center h-64 text-slate-500">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p>No orders found matching "{searchTerm}"</p>
          </div>
        ) : (
          <>
            {/* --- MOBILE CARD VIEW (< md) --- */}
            <div className="md:hidden space-y-4 p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredOrders.map((o) => (
                <motion.div
                  key={o.id}
                  layoutId={`order-${o.id}`}
                  className="p-4 bg-slate-800/80 rounded-xl shadow-lg border border-slate-700/50 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 block">#{o.reference}</span>
                      <span className="font-bold text-white">{o.recipient}</span>
                    </div>
                    {getStatusBadge(o.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Agent</p>
                      <p className="text-slate-300">{o.agent_name}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-slate-500 text-xs">Amount</p>
                       <p className="text-green-400 font-mono">GHS {Number(o.amount).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-500">{formatDate(o.created_at)}</span>
                    <div className="flex gap-2">
                       {o.status !== "Completed" && (
                        <button 
                          onClick={() => markAsCompleted(o.id)}
                          disabled={!!processingId}
                          className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-xs font-medium transition flex items-center gap-1"
                        >
                          {processingId === o.id ? <Loader2 size={12} className="animate-spin"/> : <CheckSquare size={14} />}
                          Complete
                        </button>
                       )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* --- DESKTOP TABLE VIEW (>= md) --- */}
            <div className="hidden md:block max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs text-white uppercase bg-slate-800/80 sticky top-0 backdrop-blur-sm z-10 shadow-sm">
                  <tr>
                    <th className="py-4 px-6">Reference</th>
                    <th className="py-4 px-6">Agent</th>
                    <th className="py-4 px-6">Details</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                    <th className="py-4 px-6 text-center">Payment</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrders.map((o) => (
                    <motion.tr
                      key={o.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium text-white">
                        {o.reference}
                        <div className="text-xs text-slate-500 mt-0.5">{formatDate(o.created_at)}</div>
                      </td>
                      <td className="py-4 px-6">{o.agent_name}</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-white">{o.recipient}</span>
                          <span className="text-xs text-slate-500">{o.network} • {o.data_volume}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-green-400">
                        {Number(o.amount).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-center">
                         <div className="flex justify-center">{getPaymentStatusIcon(o.payment_status)}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">{getStatusBadge(o.status)}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {o.status !== "Completed" && (
                            <button
                              onClick={() => markAsCompleted(o.id)}
                              disabled={!!processingId}
                              title="Mark as Completed"
                              className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition disabled:opacity-50"
                            >
                               {processingId === o.id ? <Loader2 size={18} className="animate-spin"/> : <CheckSquare size={18} />}
                            </button>
                          )}
                          <button className="p-2 text-slate-400 hover:text-white transition" title="View Details">
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      
      {/* Simple footer stats */}
      {!loading && (
        <div className="text-right text-xs text-slate-500">
           Showing {filteredOrders.length} of {allOrders.length} transactions
        </div>
      )}
    </motion.div>
  );
};

export default OrdersTable;
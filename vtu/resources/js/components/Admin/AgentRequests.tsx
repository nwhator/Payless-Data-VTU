import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

// --- Production Imports (Assumed available in your Laravel/React environment) ---
import axios from 'axios'; 
import { toast, Toaster } from 'sonner';

// --- Type Definitions for TypeScript ---
interface AppUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

type RequestStatus = "pending" | "approved" | "declined";

interface AgentRequest {
  id: number;
  payment_reference: string;
  status: RequestStatus;
  created_at: string;
  updated_at?: string;
  user: AppUser;
}

// Define the expected response structure from the Laravel API for fetching data
interface AgentRequestsResponse {
    agentRequests: AgentRequest[];
}

// Define the expected response structure from the Laravel API for action endpoints
interface ActionResponse {
    message: string;
    new_status: RequestStatus;
}


/**
 * Utility function to format the ISO date string.
 * @param {string} isoString
 * @returns {string}
 */
const formatDate = (isoString: string): string => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};


/**
 * Main component to display and manage all agent upgrade requests.
 */
const AgentRequests: React.FC = () => {
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Tracks which specific request is currently being actioned
  const [loadingId, setLoadingId] = useState<number | null>(null); 
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the list of agent requests from the API.
   */
  const fetchAgentRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Real API call to the Laravel endpoint
      const response = await axios.get<AgentRequestsResponse>('/admin/agent-requests');
      setRequests(response.data.agentRequests || []);
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Failed to fetch agent requests:", errorMessage);
      setError(`Failed to load requests. Please ensure the API is running. Error: ${errorMessage}`);
      toast.error("Failed to load requests from server."); 
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAgentRequests();
  }, []);

  /**
   * Handles the approval or decline action using Axios (SPA update).
   * On success, updates the local state directly without refreshing data.
   * @param {number} id
   * @param {"approve" | "decline"} type
   */
  const handleAction = async (id: number, type: "approve" | "decline") => {
    setLoadingId(id);
    const url = `/admin/agent-requests/${id}/${type}`;
    // The new status is derived directly from the action type
    const newStatus = type === "approve" ? "approved" : "declined"; 

    try {
      // 1. Send action via Axios POST
      const response = await axios.post<ActionResponse>(url);

      // 2. Handle success (display message from server response)
      toast.success(response.data.message);

      // 3. Update local state directly (SPA logic)
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === id 
            ? { 
                ...req, 
                // Set the status based on the action success
                status: newStatus as RequestStatus, 
                updated_at: new Date().toISOString() 
              } 
            : req
        )
      );
    } catch (e) {
      // Axios error handling (useful for catching non-200 responses)
      let errorMessage = "Action failed. Check API response in console.";
      if (axios.isAxiosError(e) && e.response) {
          errorMessage = e.response.data.message || e.message;
      } else if (e instanceof Error) {
          errorMessage = e.message;
      }
      
      toast.error(errorMessage);
      console.error(`Action failed for ID ${id}:`, e);
    } finally {
      setLoadingId(null);
    }
  };

  const statusText = error ? (
    <p className="text-red-400 text-sm p-4 bg-red-900/20 rounded-lg">{error}</p>
  ) : isLoading ? (
    <div className="flex items-center justify-center text-blue-400 py-6">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span>Loading agent requests...</span>
    </div>
  ) : requests.length === 0 ? (
    <p className="text-gray-400 text-sm py-6 text-center">
      No agent upgrade requests found in the database.
    </p>
  ) : null;

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
      {/* Sonner Toaster component for notifications */}
      <Toaster />
      
      {/* Standard Tailwind font setup for Inter */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #111827; }
      `}</style>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#002C3A]/60 backdrop-blur-xl p-6 rounded-xl border border-white/10 shadow-2xl max-w-6xl mx-auto font-['Inter']"
      >
        <h2 className="text-3xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-[#00C4FF] to-[#36E5B6]">
          All Agent Upgrade Requests
        </h2>

        {statusText}

        {/* Display table only if loaded and requests exist */}
        {requests.length > 0 && !isLoading && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm table-auto">
              <thead className="bg-[#002C3A]">
                <tr className="border-b border-white/20 text-left text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4 hidden lg:table-cell">User Email</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Date Requested</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    // Highlight the row if it's currently being actioned
                    className={`border-b border-white/5 transition ${loadingId === req.id ? 'bg-blue-900/20' : 'hover:bg-white/5'}`}
                  >
                    <td className="py-4 px-4 font-medium text-white max-w-[150px] truncate">
                      {req.user?.name || "N/A"}
                    </td>
                    <td className="py-4 px-4 text-slate-300 hidden lg:table-cell max-w-[200px] truncate">
                      {req.user?.email || "N/A"}
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <span className="bg-gray-700/50 px-2 py-0.5 rounded-md text-xs font-mono">
                        {req.payment_reference}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300 hidden sm:table-cell">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`capitalize font-semibold text-xs px-3 py-1 rounded-full ${
                          req.status === "pending"
                            ? "bg-yellow-900/50 text-yellow-300"
                            : req.status === "approved"
                            ? "bg-green-900/50 text-green-300"
                            : "bg-red-900/50 text-red-300"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-3 whitespace-nowrap">
                      {req.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleAction(req.id, "approve")}
                            disabled={loadingId === req.id}
                            className="text-green-400 hover:text-green-300 disabled:opacity-50 transition p-1 rounded-full hover:bg-green-900/30"
                            title="Approve Request"
                          >
                            {/* Show spinner if this specific request is loading */}
                            {loadingId === req.id ? (
                                <Loader2 className="w-5 h-5 inline animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5 inline" />
                            )}
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "decline")}
                            disabled={loadingId === req.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50 transition p-1 rounded-full hover:bg-red-900/30"
                            title="Decline Request"
                          >
                             {/* Show spinner if this specific request is loading */}
                             {loadingId === req.id ? (
                                <Loader2 className="w-5 h-5 inline animate-spin" />
                            ) : (
                                <XCircle className="w-5 h-5 inline" />
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-500 italic text-xs">
                          Actioned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AgentRequests;
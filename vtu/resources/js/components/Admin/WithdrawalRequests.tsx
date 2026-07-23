import React, { useEffect, useState } from "react"
import axios, { AxiosError } from "axios"
import { Eye, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Withdrawal = {
  id: number
  amount: number
  status: "pending" | "approved" | "completed" | "declined"
  payout_method?: string
  account_details?: string
  decline_reason?: string
  created_at: string
  user: { id: number; name: string; email: string }
  wallet: { id: number; balance: number }
}

const WithdrawalRequests: React.FC = () => {
  const [requests, setRequests] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [viewingDetails, setViewingDetails] = useState<Withdrawal | null>(null)

  const fetchRequests = async (): Promise<void> => {
    try {
      const { data } = await axios.get("/admin/withdrawals")
      setRequests(data.data)
    } catch {
      toast.error("Failed to load withdrawals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 10000)
    return () => clearInterval(interval)
  }, [])

  const approveRequest = async (id: number): Promise<void> => {
    setProcessingId(id)
    toast.loading("Approving withdrawal...", { id: "approve-" + id })

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ""
      await axios.post(`/admin/withdrawals/${id}/approve`, {}, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      })
      toast.success("Withdrawal approved and deducted.", { id: "approve-" + id })
      fetchRequests()
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>
      toast.error(err.response?.data?.error ?? "Approve failed", { id: "approve-" + id })
    } finally {
      setProcessingId(null)
    }
  }

  const declineRequest = async (id: number): Promise<void> => {
    const reason = prompt("Enter decline reason:")
    if (!reason) return
    setProcessingId(id)
    toast.loading("Declining request...", { id: "decline-" + id })

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ""
      await axios.post(`/admin/withdrawals/${id}/decline`, { decline_reason: reason }, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      })
      toast.success("Withdrawal declined.", { id: "decline-" + id })
      fetchRequests()
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>
      toast.error(err.response?.data?.error ?? "Decline failed", { id: "decline-" + id })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-600/30 text-yellow-400"
      case "completed":
        return "bg-green-600/30 text-green-400"
      case "declined":
        return "bg-red-600/30 text-red-400"
      default:
        return "bg-slate-600/30 text-slate-400"
    }
  }

  // Render account details in a formatted way
  const renderAccountDetails = (w: Withdrawal) => {
    if (!w.account_details) return "-"
    const parts = w.account_details.split("|").map(s => s.trim())
    if (w.payout_method === "momo") {
      return (
        <div className="space-y-1">
          <p><span className="text-slate-400">Name:</span> {parts[0] || "-"}</p>
          <p><span className="text-slate-400">Phone:</span> {parts[1] || "-"}</p>
        </div>
      )
    }
    return (
      <div className="space-y-1">
        <p><span className="text-slate-400">Name:</span> {parts[0] || "-"}</p>
        <p><span className="text-slate-400">Account No:</span> {parts[1] || "-"}</p>
        <p><span className="text-slate-400">Bank:</span> {parts[2] || "-"}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading withdrawal requests...
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-200">
      <h2 className="text-xl font-semibold mb-4">Withdrawal Requests</h2>

      <p className="text-slate-400 text-xs mb-4">
        Review agent withdrawal requests. Approve to deduct from their commission balance. Decline to reject.
      </p>

      {requests.length === 0 ? (
        <div className="text-center text-slate-500 py-6">No withdrawal requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="py-2">Agent</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-3">
                    <div className="font-medium">{r.user.name}</div>
                    <div className="text-xs text-slate-400">{r.user.email}</div>
                  </td>

                  <td className="font-semibold">GHS {Number(r.amount).toFixed(2)}</td>

                  <td className="capitalize">
                    {r.payout_method === "momo" ? "Mobile Money" : r.payout_method === "bank" ? "Bank Transfer" : r.payout_method || "-"}
                  </td>

                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusClasses(r.status)}`}>
                      {r.status}
                    </span>
                  </td>

                  <td>{new Date(r.created_at).toLocaleString()}</td>

                  <td>
                    {r.status === "pending" ? (
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => setViewingDetails(r)}
                          className="bg-slate-600/30 border border-slate-500 text-slate-300 px-2 py-1 rounded hover:bg-slate-600/50"
                          title="View account details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => approveRequest(r.id)}
                          disabled={processingId === r.id}
                          className="bg-blue-600/20 border border-blue-600 text-blue-400 px-3 py-1 rounded hover:bg-blue-600/30 flex items-center gap-1"
                        >
                          {processingId === r.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : null}
                          {processingId === r.id ? "Processing..." : "Approve"}
                        </button>
                        <button
                          onClick={() => declineRequest(r.id)}
                          disabled={processingId === r.id}
                          className="bg-red-600/20 border border-red-600 text-red-400 px-3 py-1 rounded hover:bg-red-600/30"
                        >
                          {processingId === r.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Decline"
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-xs">
                        {r.status === "declined" && r.decline_reason
                          ? `Declined: ${r.decline_reason}`
                          : r.status === "completed"
                          ? "Paid out"
                          : r.status}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Account Details Modal */}
      {viewingDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setViewingDetails(null)}
        >
          <div
            className="bg-[#1E1E24] p-6 rounded-xl border border-white/10 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Account Details</h3>
              <button onClick={() => setViewingDetails(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Agent</p>
                <p className="text-white font-medium">{viewingDetails.user.name}</p>
                <p className="text-slate-400 text-xs">{viewingDetails.user.email}</p>
              </div>

              <div className="border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Amount</p>
                <p className="text-white font-bold text-lg">GHS {Number(viewingDetails.amount).toFixed(2)}</p>
              </div>

              <div className="border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Payout Method</p>
                <p className="text-white capitalize">
                  {viewingDetails.payout_method === "momo" ? "Mobile Money" : viewingDetails.payout_method === "bank" ? "Bank Transfer" : viewingDetails.payout_method}
                </p>
              </div>

              <div className="border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Account Details</p>
                {renderAccountDetails(viewingDetails)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WithdrawalRequests

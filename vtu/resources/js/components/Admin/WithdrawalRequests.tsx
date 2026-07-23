import React, { useEffect, useState } from "react"
import axios, { AxiosError } from "axios"
import { Loader2 } from "lucide-react"
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
    toast.loading("Approving request...", { id: "approve-" + id })

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ""
      await axios.post(`/admin/withdrawals/${id}/approve`, {}, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      })
      toast.success("Withdrawal approved. Agent can now withdraw funds.", { id: "approve-" + id })
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
      toast.success("Withdrawal declined. Commissions re-credited.", { id: "decline-" + id })
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
      case "approved":
        return "bg-blue-600/30 text-blue-400"
      case "completed":
        return "bg-green-600/30 text-green-400"
      case "declined":
        return "bg-red-600/30 text-red-400"
      default:
        return "bg-slate-600/30 text-slate-400"
    }
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
        Approve = agent can withdraw funds. Decline = commissions re-credited to agent.
      </p>

      {requests.length === 0 ? (
        <div className="text-center text-slate-500 py-6">No withdrawal requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="py-2">Agent</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Account Details</th>
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

                  <td className="text-xs text-slate-300 max-w-[180px] truncate" title={r.account_details}>
                    {r.account_details || "-"}
                  </td>

                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusClasses(r.status)}`}>
                      {r.status}
                    </span>
                    {r.decline_reason && (
                      <p className="text-red-400 text-xs mt-1">{r.decline_reason}</p>
                    )}
                  </td>

                  <td>{new Date(r.created_at).toLocaleString()}</td>

                  <td>
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
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
                          : r.status === "approved"
                          ? "Awaiting agent withdrawal"
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
    </div>
  )
}

export default WithdrawalRequests

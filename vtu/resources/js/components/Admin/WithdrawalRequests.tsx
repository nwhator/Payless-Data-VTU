import React, { useEffect, useState } from "react"
import axios, { AxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

// ✅ Fund + Approve Button
const FundWalletButton: React.FC<{ requestId: number; userId: number; email: string; amount: number; onDone: (id: number) => void }> = ({ requestId, userId, email, amount, onDone }) => {
  const [loading, setLoading] = useState(false)

  const handleFund = async (): Promise<void> => {
    setLoading(true)
    const toastId = "fund-wallet-" + requestId
    toast.loading("Funding wallet & approving request...", { id: toastId })

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ""
      const headers = { "X-CSRF-TOKEN": csrfToken }

      // 1. Fund the wallet
      await axios.post("/admin/wallet/update", {
        user_id: userId,
        amount,
        action: "fund",
      }, { headers })

      // 2. Mark the withdrawal request as approved
      await axios.post(`/admin/withdrawals/${requestId}/approve`, {}, { headers })

      toast.success("Wallet funded & request approved!", { id: toastId })
      onDone(requestId)
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string; error?: string }>
      toast.error(err.response?.data?.error || err.response?.data?.message || "Something went wrong", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFund}
      disabled={loading}
      className="bg-emerald-600/20 border border-emerald-600 text-emerald-400 px-3 py-1 rounded hover:bg-emerald-600/30 flex items-center gap-1"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {loading ? "Processing..." : "Fund Wallet"}
    </button>
  )
}

// ✅ Withdrawal Type
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
    } catch (error: unknown) {
      console.error("Failed to load withdrawals", error)
      toast.error("⚠️ Failed to load withdrawals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 10000)
    return () => clearInterval(interval)
  }, [])

  const removeRequest = (id: number) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  const declineRequest = async (id: number): Promise<void> => {
    const reason = prompt("Enter decline reason:")
    if (!reason) return
    setProcessingId(id)
    toast.loading("Declining request...", { id: "decline" })

    try {
      await axios.post(`/admin/withdrawals/${id}/decline`, { decline_reason: reason })
      toast.success("Withdrawal declined", { id: "decline" })
      removeRequest(id)
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>
      toast.error(err.response?.data?.error ?? "Decline failed", { id: "decline" })
    } finally {
      setProcessingId(null)
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

      {requests.length === 0 ? (
        <div className="text-center text-slate-500 py-6">No withdrawal requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="py-2">Agent</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Wallet Balance</th>
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

                <td>₵{Number(r.amount).toLocaleString()}</td>

                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      r.status === "pending"
                        ? "bg-yellow-600/30 text-yellow-400"
                        : r.status === "approved" || r.status === "completed"
                        ? "bg-green-600/30 text-green-400"
                        : "bg-red-600/30 text-red-400"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>

                <td>₵{Number(r.wallet?.balance ?? 0).toLocaleString()}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>

                <td>
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <FundWalletButton
                        requestId={r.id}
                        userId={r.user.id}
                        email={r.user.email}
                        amount={r.amount}
                        onDone={removeRequest}
                      />
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

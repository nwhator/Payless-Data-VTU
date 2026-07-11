import React, { useEffect, useState } from "react"
import axios, { AxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

// ✅ Paystack Fund Button Component
const FundWalletButton: React.FC<{ userId: number; email: string; amount: number }> = ({ userId, email, amount }) => {
  const [loading, setLoading] = useState(false)

  const handleFund = async (): Promise<void> => {
    setLoading(true)
    toast.loading("Processing wallet funding...", { id: "fund-wallet" })

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ""
      const response = await axios.post("/admin/wallet/update", {
        user_id: userId,
        amount,
        action: "fund",
      }, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      })

      toast.dismiss("fund-wallet")
      toast.success(response.data?.message || "Wallet funded successfully!")
    } catch (error: unknown) {
      toast.dismiss("fund-wallet")
      const err = error as AxiosError<{ message?: string; error?: string }>
      toast.error(err.response?.data?.error || err.response?.data?.message || "Something went wrong funding wallet")
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
      Fund Wallet
    </button>
  )
}

// ✅ Withdrawal Type
type Withdrawal = {
  id: number
  amount: number
  status: "pending" | "approved" | "declined"
  payout_method?: string
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

  const declineRequest = async (id: number): Promise<void> => {
    const reason = prompt("Enter decline reason:")
    if (!reason) return
    setProcessingId(id)
    toast.loading("Declining request...", { id: "decline" })

    try {
      await axios.post(`/admin/withdrawals/${id}/decline`, { decline_reason: reason })
      toast.success("Withdrawal declined", { id: "decline" })
      fetchRequests()
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
                        : r.status === "approved"
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
                      <FundWalletButton userId={r.user.id} email={r.user.email} amount={r.amount} />
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

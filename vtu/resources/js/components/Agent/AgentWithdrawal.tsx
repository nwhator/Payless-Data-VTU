import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Send, Clock, CheckCircle, XCircle, ArrowDownLeft } from "lucide-react";

interface WithdrawalRequest {
  id: number;
  amount: number;
  payout_method: string;
  account_details: string;
  status: string;
  created_at: string;
  decline_reason?: string;
}

interface WalletStats {
  current_balance: number;
  total_commissions: number;
  pending_withdrawals: number;
}

const AgentWithdrawal: React.FC = () => {
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    amount: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, historyRes] = await Promise.all([
        axios.get("/wallet/stats"),
        axios.get("/withdrawals"),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (historyRes.data?.data) setHistory(historyRes.data.data);
    } catch {
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableBalance = stats?.total_commissions ?? 0;
  const pendingAmount = stats?.pending_withdrawals ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);

    if (!amount || amount < 20) {
      toast.error("Minimum withdrawal is GHS 20.00");
      return;
    }
    if (amount > availableBalance) {
      toast.error("Insufficient commission balance");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post("/withdraw", { amount });
      if (res.data?.message) {
        toast.success(res.data.message);
        setForm({ amount: "" });
        fetchData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.amount?.[0]
        || err?.response?.data?.error
        || err?.response?.data?.message
        || "Failed to submit withdrawal request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessPayout = async (id: number) => {
    setProcessingId(id);
    toast.loading("Processing payout via Paystack...", { id: "payout-" + id });

    try {
      const res = await axios.post(`/withdrawals/${id}/process`);
      toast.success(res.data?.message || "Payout processed!", { id: "payout-" + id });
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error
        || err?.response?.data?.details
        || "Payout failed. Please try again.";
      toast.error(msg, { id: "payout-" + id });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={14} className="text-green-400" />;
      case "approved":
        return <Clock size={14} className="text-blue-400" />;
      case "declined":
        return <XCircle size={14} className="text-red-400" />;
      default:
        return <Clock size={14} className="text-yellow-400" />;
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return status === "completed"
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "declined":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      default:
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
    }
  };

  const formatCurrency = (v: number) =>
    `GHS ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#00C4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1E3A4B] to-[#0B1C24] p-5 rounded-xl border border-[#00C4FF]/20">
          <p className="text-xs text-[#00C4FF] uppercase tracking-wider font-medium">Commission Balance</p>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(availableBalance)}</p>
          <p className="text-xs text-slate-400 mt-1">Available for withdrawal</p>
        </div>
        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Pending Withdrawals</p>
          <p className="text-2xl font-bold text-yellow-400 mt-2">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-slate-400 mt-1">Awaiting admin approval</p>
        </div>
        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Wallet Balance</p>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(stats?.current_balance ?? 0)}</p>
          <p className="text-xs text-slate-400 mt-1">For data purchases</p>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Send size={20} className="text-[#00C4FF]" /> Request Withdrawal
        </h3>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-5">
          <p className="text-xs text-amber-200">
            Withdrawal requests are reviewed by an admin. Once approved, funds will be sent to your registered Paystack account. Minimum withdrawal: GHS 20.00
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Amount (GHS)</label>
            <input
              type="number"
              min="20"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ amount: e.target.value })}
              placeholder="Enter amount (min 20.00)"
              required
              className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-[#00C4FF] focus:border-[#00C4FF] transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.amount || parseFloat(form.amount) < 20}
            className="w-full py-3 px-4 bg-[#00C4FF] text-slate-900 font-bold rounded-lg hover:bg-[#33d8ff] transition disabled:bg-slate-700 disabled:text-slate-500 flex items-center justify-center"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2" />
                Submitting Request...
              </>
            ) : (
              <>
                <Send size={18} className="mr-2" />
                Submit Withdrawal Request
              </>
            )}
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <ArrowDownLeft size={20} className="text-[#00C4FF]" /> Withdrawal History
        </h3>

        {history.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No withdrawal requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((w) => (
                  <tr key={w.id} className="border-b border-white/5">
                    <td className="py-3 text-slate-300">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-white font-semibold">{formatCurrency(w.amount)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusClasses(w.status)}`}>
                        {getStatusIcon(w.status)} {w.status}
                      </span>
                      {w.decline_reason && (
                        <p className="text-red-400 text-xs mt-1">{w.decline_reason}</p>
                      )}
                    </td>
                    <td className="py-3">
                      {w.status === "approved" ? (
                        <button
                          onClick={() => handleProcessPayout(w.id)}
                          disabled={processingId === w.id}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-500 transition flex items-center gap-1"
                        >
                          {processingId === w.id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ArrowDownLeft size={14} />
                          )}
                          {processingId === w.id ? "Processing..." : "Withdraw Now"}
                        </button>
                      ) : w.status === "pending" ? (
                        <span className="text-slate-500 text-xs italic">Awaiting approval</span>
                      ) : w.status === "completed" ? (
                        <span className="text-green-400 text-xs">Paid out</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentWithdrawal;

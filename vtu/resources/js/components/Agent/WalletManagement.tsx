import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { usePage } from "@inertiajs/react";
import { CreditCard, DollarSign, Info, AlertCircle } from "lucide-react";

interface FormErrors {
  email?: string[];
  amount?: string[];
}

interface FlashMessages {
  success?: string;
  error?: string;
}

interface PagePropsWithFlash {
  flash?: FlashMessages;
}

interface PaymentBreakdown {
  amount: number;
  fee: number;
  total: number;
  percentage: number;
}

declare function route(name: string, params?: Record<string, unknown>): string;

const AgentWalletFunding: React.FC = () => {
  const { props } = usePage() as { props: PagePropsWithFlash };

  const [form, setForm] = useState({
    email: "",
    amount: 10.0,
  });

  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch wallet balance
  const fetchWalletBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const res = await axios.get("/wallet/stats");
      if (res.data) {
        if (typeof res.data.balance === "number") setBalance(res.data.balance);
        if (res.data.email) setForm((prev) => ({ ...prev, email: res.data.email }));
      }
    } catch {
      toast.error("Failed to fetch wallet balance.");
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(isNaN(value) ? 0 : value);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    const newValue =
      type === "number" ? (isNaN(parseFloat(value)) ? 0 : parseFloat(value)) : value;

    setForm((prev) => ({
      ...prev,
      [id]: newValue,
    }));
  };

  // Flash messages
  useEffect(() => {
    if (props.flash?.success) toast.success(props.flash.success);
    else if (props.flash?.error) toast.error(props.flash.error);
  }, [props.flash]);

  // Calculate fee preview
  const getFeePreview = (): PaymentBreakdown | null => {
    if (!form.amount || form.amount < 10) return null;
    
    const feePercentage = 2.5;
    const amount = form.amount;
    const fee = (amount * feePercentage) / 100;
    const total = amount + fee;
    
    return {
      amount: parseFloat(amount.toFixed(2)),
      fee: parseFloat(fee.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      percentage: feePercentage
    };
  };

  const feePreview = getFeePreview();

  // Fund wallet
  const fundWallet = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setProcessing(true);
      setErrors({});

      if (form.amount < 10) {
        toast.error("Minimum top-up amount is GH₵ 10.00.");
        setProcessing(false);
        return;
      }

      try {
        const payload = { email: form.email, amount: form.amount };
        const response = await axios.post(route("agent.paystack.initialize"), payload);

        if (response.data.success && response.data.authorization_url) {
          toast.info(
            response.data.message || "Redirecting to Paystack...", 
            { duration: 3000 }
          );
          
          setTimeout(() => {
            window.location.href = response.data.authorization_url;
          }, 1000);
        } else {
          toast.error(response.data.message || "Payment initialization failed.");
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 422) {
            setErrors(error.response.data.errors);
            toast.error("Validation failed. Check form errors.");
          } else {
            toast.error(error.response.data.message || "Server error occurred.");
          }
        } else {
          toast.error("Network error or unable to reach the API.");
        }
      } finally {
        setProcessing(false);
      }
    },
    [form]
  );

  const isAmountValid = form.amount >= 10;

  return (
    <div className="bg-white/5 p-6 rounded-xl border border-white/10 shadow-xl w-full">
      <h3 className="text-xl font-semibold mb-4 text-white flex items-center border-b border-white/10 pb-3">
        <CreditCard size={20} className="mr-2 text-[#00C4FF]" /> Agent Wallet Top-Up (Paystack)
      </h3>

      {/* Fee Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertCircle className="text-amber-400 mt-0.5 flex-shrink-0" size={18} />
        <div className="text-xs text-amber-100">
          <p className="font-semibold mb-1">Transaction Fee Notice</p>
          <p>A <strong>2.5% fee</strong> will be added to your funding amount.</p>
        </div>
      </div>

      {/* Wallet Balance Display */}
      <div className="bg-gradient-to-r from-[#1E3A4B] to-[#0B1C24] p-6 rounded-xl shadow-lg border border-[#33d8ff]/20 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#33d8ff] uppercase tracking-wider">
            Current Working Balance
          </p>
          <DollarSign size={24} className="text-[#00C4FF]" />
        </div>
        <p className="mt-4 text-3xl font-extrabold text-white">
          {loadingBalance ? "Fetching..." : formatCurrency(balance)}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Funds available for service purchase.
        </p>
      </div>

      {/* Top-up Form */}
      <form onSubmit={fundWallet}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">
            Your Email (for Paystack verification)
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={processing}
            className={`w-full p-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:ring-[#00C4FF] focus:border-[#00C4FF] transition ${
              errors.email ? "border-red-500" : "border-slate-600"
            } disabled:bg-slate-700/80`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email[0]}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-slate-400 mb-1">
            Amount to Fund (GH₵)
          </label>
          <input
            id="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            min="10"
            step="0.01"
            required
            disabled={processing}
            className={`w-full p-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:ring-[#00C4FF] focus:border-[#00C4FF] transition ${
              errors.amount ? "border-red-500" : "border-slate-600"
            } disabled:bg-slate-700/80`}
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount[0]}</p>}
          {!isAmountValid && form.amount > 0 && (
            <p className="text-red-400 text-xs mt-1 flex items-center">
              <Info size={14} className="mr-1" /> Minimum funding amount is GH₵ 10.00.
            </p>
          )}
        </div>

        {/* Fee Preview */}
        {feePreview && (
          <div className="bg-white/5 rounded-lg p-3 mb-4 space-y-1 text-sm border border-[#00C4FF]/20">
            <div className="flex justify-between">
              <span className="text-slate-300">Funding Amount:</span>
              <span className="font-semibold">₵ {feePreview.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Transaction Fee ({feePreview.percentage}%):</span>
              <span className="font-semibold text-amber-400">₵ {feePreview.fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/10 pt-1 mt-1"></div>
            <div className="flex justify-between text-base">
              <span className="font-bold">Total to Pay:</span>
              <span className="font-bold text-[#00C4FF]">₵ {feePreview.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={processing || !isAmountValid || !form.email}
          className="w-full py-3 px-4 bg-[#00C4FF] text-slate-900 font-bold rounded-lg shadow-md hover:bg-[#33d8ff] transition duration-300 disabled:bg-slate-700 disabled:text-slate-500 flex items-center justify-center"
        >
          {processing ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2"></div>
              Initializing Secure Payment...
            </>
          ) : (
            `Proceed to Paystack: ${formatCurrency(feePreview?.total ?? form.amount)}`
          )}
        </button>

        <p className="text-center text-xs text-slate-500 mt-2">Powered by Paystack</p>
      </form>
    </div>
  );
};

export default AgentWalletFunding;
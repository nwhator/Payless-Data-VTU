import React, { useState } from "react";
import { CreditCard, Loader2, AlertCircle, TrendingUp, Info } from "lucide-react";
import { Button } from "./ui/button";
import axios from "axios"; 
import { toast } from "sonner";

interface UpgradeToAgentFormProps {
  userId: number;
  userEmail: string;
  upgradeFee?: number; // e.g., 50.00 GHS
  onSuccess?: () => void;
}

interface PaymentBreakdown {
  amount: number;
  fee: number;
  total: number;
  percentage: number;
}

export default function UpgradeToAgentForm({ 
  userId, 
  userEmail, 
  upgradeFee = 20,
  onSuccess 
}: UpgradeToAgentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate fee for upgrade
  const getPaymentBreakdown = (): PaymentBreakdown => {
    const feePercentage = 2.5;
    const fee = (upgradeFee * feePercentage) / 100;
    const total = upgradeFee + fee;
    
    return {
      amount: parseFloat(upgradeFee.toFixed(2)),
      fee: parseFloat(fee.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      percentage: feePercentage
    };
  };

  const breakdown = getPaymentBreakdown();

  const submitUpgrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const response = await axios.post("/paystack/customer/upgrade/initialize", {
        user_id: userId,
        email: userEmail,
        amount: upgradeFee,
      });

      const { authorization_url, message } = response.data;

      if (authorization_url) {
        toast.info(message || "Redirecting to Paystack...", { duration: 3000 });
        
        setTimeout(() => {
          window.location.href = authorization_url;
        }, 1000);
      } else {
        toast.success("Upgrade payment initialized!");
        onSuccess?.();
      }

    } catch (err) {
      console.error("Upgrade Payment Error:", err);
      
      let msg = "Failed to initiate upgrade payment.";
      
      if (axios.isAxiosError(err) && err.response) {
          if (err.response.status === 419) {
              msg = "Session expired. Please refresh the page and try again.";
              window.location.reload();
          } else if (err.response.status === 403) {
              msg = err.response.data.message || "You are already an agent.";
          } else {
              msg = err.response.data.message || msg;
          }
      }
      
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submitUpgrade} className="text-center space-y-4">
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-1 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
        <TrendingUp className="text-white" size={32} />
      </div>
      
      <h3 className="text-xl font-semibold text-white">Upgrade to Agent Account</h3>
      <p className="text-slate-300 text-sm">
        Unlock agent features and start earning commissions on sales.
      </p>

      {/* Fee Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2 text-left">
        <AlertCircle className="text-amber-400 mt-0.5 flex-shrink-0" size={16} />
        <div className="text-xs text-amber-100">
          <p className="font-semibold">Transaction Fee Notice</p>
          <p>A <strong>2.5% processing fee</strong> will be added to the upgrade cost.</p>
        </div>
      </div>

      {/* Upgrade Fee Display */}
      <div className="bg-white/5 rounded-lg p-4 text-left border border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-300 text-sm">Agent Upgrade Fee:</span>
          <span className="text-2xl font-bold text-white">₵ {upgradeFee.toFixed(2)}</span>
        </div>
        
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <Info size={12} />
          {showDetails ? "Hide" : "Show"} payment breakdown
        </button>

        {/* Payment Breakdown */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Upgrade Fee:</span>
              <span className="font-semibold">₵ {breakdown.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Processing Fee ({breakdown.percentage}%):</span>
              <span className="font-semibold text-amber-400">₵ {breakdown.fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/10 pt-1 mt-1"></div>
            <div className="flex justify-between text-base">
              <span className="font-bold">Total to Pay:</span>
              <span className="font-bold text-blue-400">₵ {breakdown.total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Agent Benefits */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-4 text-left border border-purple-500/30">
        <p className="text-xs font-semibold text-purple-300 mb-2">AGENT BENEFITS:</p>
        <ul className="text-xs text-slate-300 space-y-1">
          <li>✓ Access to wholesale pricing</li>
          <li>✓ Earn commissions on every sale</li>
          <li>✓ Create and manage your own store</li>
          <li>✓ Advanced analytics and reporting</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-left">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold" 
        disabled={loading}
      >
        {loading ? (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Upgrade...
            </>
        ) : (
            <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ₵{breakdown.total.toFixed(2)} & Upgrade Now
            </>
        )}
      </Button>
      
      <p className="text-xs text-slate-400 mt-2">
        Secured by Paystack • One-time payment
      </p>
    </form>
  );
}
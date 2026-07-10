import React, { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import axios from "axios"; // Ensure axios is imported
import { toast } from "sonner"; // Assuming you use sonner for consistency

interface FundWalletFormProps {
  userId: number;
  userEmail: string;
  onSuccess?: () => void;
}

export default function FundWalletForm({ userId, userEmail, onSuccess }: FundWalletFormProps) {
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  // We can use toast instead of local error state for a cleaner UI, 
  // but keeping local error is fine too.
  const [error, setError] = useState<string | null>(null);

  const submitFund = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 10) {
      setError("Please enter a minimum of 10 GHS.");
      return;
    }

    setLoading(true);
    
    try {
      // AXIOS handles the CSRF token automatically via cookies
      const response = await axios.post("/paystack/customer/fund/initialize", {
        user_id: userId,
        email: userEmail,
        amount: numericAmount,
      });

      // If successful, axios returns the data in response.data
      const { authorization_url } = response.data;

      if (authorization_url) {
        // Redirect to Paystack
        window.location.href = authorization_url;
      } else {
        toast.success("Payment initialized!");
        onSuccess?.();
      }

    } catch (err) {
      console.error("Payment Error:", err);
      
      // Handle Laravel Validation Errors or General Errors
      let msg = "Failed to initiate payment.";
      
      if (axios.isAxiosError(err) && err.response) {
          // If status is 419, it's a CSRF issue that usually requires a refresh
          if (err.response.status === 419) {
              msg = "Session expired. Please refresh the page and try again.";
              window.location.reload(); // Optional: Auto-reload
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
    <form onSubmit={submitFund} className="text-center space-y-4">
      <CreditCard className="mx-auto mb-3 text-yellow-400" size={24} />
      <h3 className="text-xl font-semibold text-white">Fund Your Wallet</h3>
      <p className="text-slate-300 text-sm">
        Enter the amount you wish to add using your preferred payment gateway.
      </p>

      <div className="space-y-3 mb-6 text-left">
        <label htmlFor="fund-amount" className="text-xs text-slate-200">Amount (GHS)</label>
        <div className="relative">
            <input
            id="fund-amount"
            type="number"
            step="0.01"
            value={amount === "" ? "" : String(amount)}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="500.00"
            className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white focus:ring-yellow-500 focus:border-yellow-500 pl-8"
            required
            />
            <span className="absolute left-3 top-2 text-slate-400 text-sm">₵</span>
        </div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      <Button type="submit" className="w-full justify-center" disabled={loading}>
        {loading ? (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
            </>
        ) : "Proceed to Pay"}
      </Button>
      
      <p className="text-xs text-slate-400 mt-2">
        Secured by Paystack
      </p>
    </form>
  );
}
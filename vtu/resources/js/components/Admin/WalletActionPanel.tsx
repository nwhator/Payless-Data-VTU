import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// --- UNIFIED TYPE DEFINITION (Must match UserAndWalletManagement.tsx) ---
interface UserDetail {
    id: number;
    name: string;
    email: string;
    role: "agent" | "customer" | string;
    balance?: number; // FIX: Made optional to align with the parent component's state
    sales_commission?: number;
    commission_earned?: number;
}

interface Props {
  user: UserDetail;
  // This prop expects a complete UserDetail object back upon a successful update
  setUser: (u: UserDetail) => void; 
}

const WalletActionPanel: React.FC<Props> = ({ user, setUser }) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Use UserDetail for type assertion
  const handleAction = async (action: "fund" | "deduct") => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/admin/wallet/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: value,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      // Update UI instantly
      // Assert the updated user object as UserDetail, and include the new balance
      const updatedUser: UserDetail = { ...user, balance: data.new_balance };
      setUser(updatedUser); 
      
      setAmount("");
      toast.success(data.message);

    } catch (err: any) {
      toast.error(err.message || "Failed to update wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white/5 border border-white/10 rounded-xl shadow-lg h-full" 
    >
      <h3 className="text-lg font-semibold text-white mb-3">
        Manage Wallet — {user.name}
      </h3>

      <p className="text-sm text-slate-400 mb-4">
        Current Balance:{" "}
        {/* Safely display balance using optional chaining and nullish coalescing */}
        <span className="text-green-400">GHS {user.balance?.toFixed(2) ?? "0.00"}</span>
      </p>

      <div className="space-y-3">
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          className="w-full p-2 bg-slate-800/50 border border-white/10 rounded-lg text-white disabled:opacity-50"
        />

        <div className="flex gap-3">
          <button
            onClick={() => handleAction("fund")}
            disabled={loading}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fund Wallet"}
          </button>

          <button
            onClick={() => handleAction("deduct")}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deduct"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default WalletActionPanel;
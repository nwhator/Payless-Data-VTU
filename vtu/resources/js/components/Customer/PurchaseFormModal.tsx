import React, { useState, useEffect } from "react";
import type { Product, User } from "@/lib/types";
import { X, Package, Loader2, Info } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";

interface Props {
  product: Product;
  user: User | undefined;
  onClose: () => void;
}

interface PaymentBreakdown {
  amount: number;
  fee: number;
  total: number;
  percentage: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GHANA_PHONE_REGEX = /^0(20|24|26|27|50|54|55|56|57|59)\d{7}$/;

const getCookieToken = (): string | null => {
  try {
    const tokenMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return tokenMatch && tokenMatch[1] ? decodeURIComponent(tokenMatch[1]) : null;
  } catch (e) {
    console.error("Error reading CSRF token from cookie:", e);
    return null;
  }
};

export default function PurchaseFormModal({ product, user, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);

  const safePrice = Number(product.customer_price ?? 0);
  const isFormValid =
    EMAIL_REGEX.test(email) && GHANA_PHONE_REGEX.test(phone) && !!user?.id;

  useEffect(() => {
    const fetchCsrfCookie = async () => {
      try {
        await fetch("/sanctum/csrf-cookie", {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
      } catch (e) {
        console.error("Failed to refresh CSRF cookie:", e);
      }
    };
    void fetchCsrfCookie();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setLocalError("Please fill all fields correctly and ensure you are logged in.");
      return;
    }

    setLoading(true);
    setLocalError("");
    setPaymentBreakdown(null);

    const csrfToken = getCookieToken();

    if (!csrfToken) {
      toast.error("Session token missing. Please refresh the page.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/paystack/main-initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          amount: safePrice,
          product_id: product.id,
          recipient_number: phone,
          user_id: user!.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Payment initialization failed (Server Error).");
      }

      if (data.status === 'wallet_success') {
        toast.success(data.message || "Purchase successful! Processing data delivery...", { duration: 5000 });
        onClose();

      } else if (data.authorization_url) {
        // Store payment breakdown if provided
        if (data.payment_breakdown) {
          setPaymentBreakdown(data.payment_breakdown);
        }

        toast.info(data.message || "Redirecting to Paystack for payment...", { duration: 3000 });

        setTimeout(() => {
            window.location.href = data.authorization_url;
        }, 1000);

      } else {
          toast.success(data.message || "Transaction initiated, awaiting confirmation.", { duration: 5000 });
          onClose();
      }

    } catch (err: any) {
      console.error("Payment error:", err);
      const errorMessage = err?.message || "Unexpected error during payment.";
      toast.error(errorMessage, { duration: 5000 });
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.id) {
    return (
      <div className="p-6 bg-red-800/20 text-white rounded-lg w-full max-w-md mx-auto text-center">
        <p className="text-xl font-bold mb-2">Login Required</p>
        <p>You must be logged in to purchase this product.</p>
        <Button onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#00121A] text-white rounded-lg w-full max-w-md mx-auto relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Pay with Card / Details</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex items-center bg-white/5 p-4 rounded-lg mb-6">
        <Package className="text-[#4DFF8F] mr-3" size={24} />
        <div>
          <p className="font-semibold text-sm text-slate-300">Product</p>
          <p className="font-semibold">
            {product.name} {product.capacity ?? ""}
          </p>
          <p className="text-2xl font-extrabold text-[#00C4FF]">
            {product.currency ?? "₵"} {safePrice.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Fee Information Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Info className="text-amber-400 mt-0.5 flex-shrink-0" size={18} />
        <div className="text-xs text-amber-100">
          <p className="font-semibold mb-1">Paystack Transaction Fee</p>
          <p>
            If wallet balance is insufficient, a <strong>2.5% fee</strong> will be added to card payments.
            Wallet payments have <strong>no fees</strong>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Recipient Email</label>
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white"
          />
          {email && !EMAIL_REGEX.test(email) && (
            <p className="text-xs text-red-400 mt-1">Enter a valid email.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Recipient Ghana Phone</label>
          <Input
            type="tel"
            placeholder="e.g. 024XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white"
          />
          {phone && !GHANA_PHONE_REGEX.test(phone) && (
            <p className="text-xs text-red-400 mt-1">
              Must be a valid Ghana mobile number.
            </p>
          )}
        </div>

        {/* Show payment breakdown if available */}
        {paymentBreakdown && (
          <div className="bg-white/5 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-300">Product Amount:</span>
              <span className="font-semibold">₵ {paymentBreakdown.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Paystack Fee ({paymentBreakdown.percentage}%):</span>
              <span className="font-semibold text-amber-400">₵ {paymentBreakdown.fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/10 pt-1 mt-1"></div>
            <div className="flex justify-between text-base">
              <span className="font-bold">Total to Pay:</span>
              <span className="font-bold text-[#00C4FF]">₵ {paymentBreakdown.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {localError && <p className="text-red-400 text-sm text-center">{localError}</p>}

        <Button
          type="submit"
          disabled={!isFormValid || loading}
          className="w-full justify-center bg-[#00C4FF] hover:bg-[#00C4FF]/90 text-black font-bold"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Proceed to Payment"}
        </Button>

        <p className="text-center text-xs text-slate-500 mt-1">Powered by Paystack</p>
      </form>
    </div>
  );
}
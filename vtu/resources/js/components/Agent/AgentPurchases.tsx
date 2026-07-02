import React, { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, AlertCircle, Wallet } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: number
  name: string
  capacity: string
  agent_price: number
}

interface OrderForm {
  product_id: string
  product_name?: string
  capacity?: string
  agent_price?: number
  beneficiary_number: string
  reference: string
}

interface PaymentBreakdown {
  amount: number
  fee: number
  total: number
  percentage: number
}

// Backend response structure for failed wallet fulfillment
interface FailedWalletResponse {
    success: false;
    status: 'wallet_fulfillment_reversed' | 'wallet_system_failure_reversed';
    message: string; // This holds the vendor error message or system error
    transaction_id: number;
    order_id: number;
}

const AgentPurchase: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [type, setType] = useState<"single" | "bulk">("single")
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null)

  const [form, setForm] = useState<OrderForm>({
    product_id: "",
    product_name: "",
    capacity: "",
    agent_price: 0,
    beneficiary_number: "",
    reference: "",
  })

  const [bulkOrders, setBulkOrders] = useState<OrderForm[]>([
    { product_id: "", product_name: "", capacity: "", agent_price: 0, beneficiary_number: "", reference: "" },
  ])

  // Get CSRF token from cookie (Sanctum)
  const getCookieToken = (): string | null => {
    try {
      const tokenMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
      return tokenMatch && tokenMatch[1] ? decodeURIComponent(tokenMatch[1]) : null
    } catch (e) {
      console.error("Error reading CSRF token from cookie:", e)
      return null
    }
  }

  // Fetch CSRF cookie on mount
  useEffect(() => {
    const fetchCsrfCookie = async () => {
      try {
        // This endpoint forces Laravel to refresh the XSRF-TOKEN cookie
        await fetch("/sanctum/csrf-cookie", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin"
        })
      } catch (e) {
        console.error("Failed to refresh CSRF cookie:", e)
      }
    }
    void fetchCsrfCookie()
  }, [])

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/agent/products", { 
          headers: { Accept: "application/json" },
          credentials: "same-origin"
        })
        const data = await res.json()

        if (data.success && Array.isArray(data.products)) {
          const normalized = data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            capacity: p.capacity ?? "",
            agent_price: Number(p.agent_price ?? p.price ?? 0),
          }))
          setProducts(normalized)
        } else {
          toast.error(data.message || "⚠️ Failed to load available products")
        }
      } catch {
        toast.error("⚠️ Network error loading products")
      }
    }

    loadProducts()
  }, [])

  // Submit single or bulk
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPaymentBreakdown(null)

    const csrfToken = getCookieToken()

    if (!csrfToken) {
      toast.error("Session token missing. Please refresh the page.")
      setLoading(false)
      return
    }

    try {
      const endpoint = type === "single" 
        ? "/agent/purchase/initialize" 
        : "/agent/purchase/bulk" 

      const payload = type === "single" 
        ? {
            product_id: parseInt(form.product_id),
            beneficiary_number: form.beneficiary_number,
            reference: form.reference || null,
          }
        : { orders: bulkOrders }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      // Handle server error responses (4xx or 5xx)
      if (!res.ok) {
        // Check for specific wallet reversal statuses from the backend (400 or 500 status codes)
        if (data.status === 'wallet_fulfillment_reversed' || data.status === 'wallet_system_failure_reversed') {
             // Wallet funds were debited, but immediately credited back due to vendor/system error.
             toast.error(
                <>
                    ❌ **Purchase Failed & Reversed:**
                    <p className="mt-1 text-sm">{data.message}</p>
                    <p className="mt-1 text-xs text-amber-300">Funds returned to wallet (ID: {data.transaction_id}).</p>
                </>,
                { duration: 8000 }
             );
        } else {
            // General validation or server error
            const errorMessage = data.message || "Purchase failed (HTTP error).";
            toast.error(errorMessage);
        }
        setLoading(false);
        return; // Stop processing further success logic
      }

      // Handle successful HTTP response (200 status code)
      if (data.success) {
        // Handle payment breakdown if returned
        if (data.payment_breakdown) {
          setPaymentBreakdown(data.payment_breakdown)
        }

        // WALLET SUCCESS (Fulfillment successful)
        if (data.status === 'wallet_success') {
          toast.success(data.message || "✅ Purchase successful using wallet!", { duration: 5000 })
          
          // Reset form
          setForm({
            product_id: "",
            product_name: "",
            capacity: "",
            agent_price: 0,
            beneficiary_number: "",
            reference: "",
          })
          setBulkOrders([
            { product_id: "", product_name: "", capacity: "", agent_price: 0, beneficiary_number: "", reference: "" },
          ])

        } 
        // PAYSTACK REDIRECT (Insufficient wallet)
        else if (data.authorization_url) {
          toast.info(
            data.message || "Insufficient wallet balance. Redirecting to Paystack...",
            { duration: 3000 }
          )
          
          setTimeout(() => {
            window.location.href = data.authorization_url
          }, 1000)
        } 
        // BULK SUCCESS
        else {
          toast.success(data.message || "✅ Bulk purchase successful!")
          
          setBulkOrders([
            { product_id: "", product_name: "", capacity: "", agent_price: 0, beneficiary_number: "", reference: "" },
          ])
        }
      } else {
        // This block is for success: false responses that had a 200 status code (less common but possible)
        toast.error(data.message || "❌ Purchase failed.")
      }
    } catch (err: any) {
      console.error("Purchase error:", err)
      // Catch network errors or explicit `throw new Error`
      const errorMessage = err?.message || "⚠️ Network error or unexpected response."
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Add/remove bulk entry
  const addBulkRow = () =>
    setBulkOrders([
      ...bulkOrders,
      { product_id: "", product_name: "", capacity: "", agent_price: 0, beneficiary_number: "", reference: "" },
    ])

  const removeBulkRow = (index: number) =>
    setBulkOrders(bulkOrders.filter((_, i) => i !== index))

  const updateBulkRow = (index: number, field: string, value: string) => {
    setBulkOrders(
      bulkOrders.map((row, i) => {
        if (i !== index) return row
        if (field === "product_id") {
          const selected = products.find((p) => p.id === Number(value))
          if (selected) {
            return {
              ...row,
              product_id: selected.id.toString(),
              product_name: selected.name,
              capacity: selected.capacity,
              agent_price: selected.agent_price,
            }
          }
        }
        return { ...row, [field]: value }
      })
    )
  }

  // Handle single product selection
  const handleSingleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = products.find((p) => p.id === Number(e.target.value))
    if (selected) {
      setForm({
        ...form,
        product_id: selected.id.toString(),
        product_name: selected.name,
        capacity: selected.capacity,
        agent_price: selected.agent_price,
      })
    } else {
      setForm({
        ...form,
        product_id: "",
        product_name: "",
        capacity: "",
        agent_price: 0,
      })
    }
  }

  // Calculate fee preview for single purchase
  const getFeePreview = () => {
    if (type !== "single" || !form.agent_price || form.agent_price <= 0) return null
    
    // NOTE: Hardcoding 2.5% fee as per the requirements/backend logic assumption.
    const feePercentage = 2.5 
    const amount = form.agent_price
    const fee = (amount * feePercentage) / 100
    const total = amount + fee
    
    return {
      amount: amount.toFixed(2),
      fee: fee.toFixed(2),
      total: total.toFixed(2),
      percentage: feePercentage
    }
  }

  const feePreview = getFeePreview()

  return (
    <div className="max-w-3xl mx-auto bg-[#0F1E27]/80 border border-white/10 rounded-2xl p-6 shadow-lg backdrop-blur-md">
      <h2 className="text-2xl font-semibold text-white mb-6">🛒 Agent Purchase</h2>

      {/* Payment Method Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Wallet className="text-blue-400 mt-0.5 flex-shrink-0" size={18} />
        <div className="text-xs text-blue-100">
          <p className="font-semibold mb-1">Smart Payment</p>
          <p>
            We'll use your <strong>wallet first</strong> (no fees). 
            If insufficient, you'll be redirected to Paystack with a <strong>2.5% fee</strong>.
          </p>
        </div>
      </div>

      {/* Fee Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 flex items-start gap-2">
        <AlertCircle className="text-amber-400 mt-0.5 flex-shrink-0" size={18} />
        <div className="text-xs text-amber-100">
          <p className="font-semibold mb-1">Transaction Fee Notice</p>
          <p>A <strong>2.5% fee</strong> applies only to Paystack card payments.</p>
        </div>
      </div>

      {/* Purchase Type Toggle */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <button
          onClick={() => setType("single")}
          type="button"
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            type === "single" ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
          }`}
        >
          Single Purchase
        </button>
        <button
          onClick={() => setType("bulk")}
          type="button"
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            type === "bulk" ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
          }`}
        >
          Bulk Purchase
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {type === "single" ? (
          <>
            {/* Product Selection */}
            <div>
              <label className="block mb-1 text-sm text-slate-300">Select Product</label>
              <select
                className="w-full bg-[#0F1E27] text-white border border-white/20 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.product_id}
                onChange={handleSingleProductChange}
                required
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.capacity ? `(${p.capacity})` : ""} — ₵
                    {Number(p.agent_price ?? 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Fee Preview for Single Purchase */}
            {feePreview && (
              <div className="bg-white/5 rounded-lg p-3 space-y-1 text-sm border border-blue-500/20">
                <p className="text-xs text-slate-400 mb-2">If using Paystack (insufficient wallet):</p>
                <div className="flex justify-between">
                  <span className="text-slate-300">Product Amount:</span>
                  <span className="font-semibold">₵ {feePreview.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Transaction Fee ({feePreview.percentage}%):</span>
                  <span className="font-semibold text-amber-400">₵ {feePreview.fee}</span>
                </div>
                <div className="border-t border-white/10 pt-1 mt-1"></div>
                <div className="flex justify-between text-base">
                  <span className="font-bold">Total to Pay:</span>
                  <span className="font-bold text-blue-400">₵ {feePreview.total}</span>
                </div>
              </div>
            )}

            {/* Beneficiary Number */}
            <div>
              <label className="block mb-1 text-sm text-slate-300">Beneficiary Number</label>
              <input
                type="text"
                value={form.beneficiary_number}
                onChange={(e) => setForm({ ...form, beneficiary_number: e.target.value })}
                placeholder="Enter phone number"
                className="w-full bg-white/10 text-white border border-white/10 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block mb-1 text-sm text-slate-300">Reference (optional)</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Custom reference"
                className="w-full bg-white/10 text-white border border-white/10 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              {bulkOrders.map((order, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-center bg-white/5 p-3 rounded-lg"
                >
                  <select
                    className="col-span-4 bg-[#0F1E27] text-white border border-white/20 rounded-lg px-2 py-2 focus:border-blue-500 focus:outline-none"
                    value={order.product_id}
                    onChange={(e) => updateBulkRow(i, "product_id", e.target.value)}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.capacity ? `(${p.capacity})` : ""} — ₵
                        {Number(p.agent_price ?? 0).toFixed(2)}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Phone number"
                    value={order.beneficiary_number}
                    onChange={(e) => updateBulkRow(i, "beneficiary_number", e.target.value)}
                    className="col-span-5 bg-white/10 text-white border border-white/10 rounded-lg px-2 py-2 focus:border-blue-500 focus:outline-none"
                    required
                  />

                  <input
                    type="text"
                    placeholder="Ref"
                    value={order.reference}
                    onChange={(e) => updateBulkRow(i, "reference", e.target.value)}
                    className="col-span-2 bg-white/10 text-white border border-white/10 rounded-lg px-2 py-2 focus:border-blue-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => removeBulkRow(i)}
                    className="col-span-1 text-red-400 hover:text-red-500 transition-colors"
                    disabled={bulkOrders.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addBulkRow}
              className="flex items-center gap-2 bg-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Another
            </button>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || (type === 'single' && !form.product_id) || (type === 'bulk' && bulkOrders.some(o => !o.product_id || !o.beneficiary_number))}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg py-3 flex justify-center items-center gap-2 font-medium transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Processing...
            </>
          ) : (
            "Purchase"
          )}
        </button>

        <p className="text-center text-xs text-slate-500 mt-2">
          Wallet payments are free • Card payments via Paystack
        </p>
      </form>
    </div>
  )
}

export default AgentPurchase
import React, { useEffect, useState } from "react"
import { Pencil, RefreshCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"

type ProductType = {
  id: number
  name: string
  capacity?: string
  admin_agent_price?: number | null
  added_amount?: number | null
  agent_price?: number | null
  profit?: number | null
}

// --- Helper Function to retrieve XSRF-TOKEN from cookies ---
const getCookieToken = (): string | null => {
  try {
    const tokenMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return tokenMatch && tokenMatch[1] ? decodeURIComponent(tokenMatch[1]) : null;
  } catch (e) {
    console.error("Error reading CSRF token from cookie:", e);
    return null;
  }
};

export default function AgentPricesAndProfit() {
  const [products, setProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [savingId, setSavingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState<{ added_amount: number | "" }>({
    added_amount: "",
  })

  // --- 1. Initialize CSRF Cookie on Mount ---
  const fetchCsrfCookie = async () => {
    try {
      await fetch("/sanctum/csrf-cookie", {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
    } catch (e) {
      console.error("Failed to refresh CSRF cookie:", e);
    }
  }

  // --- 2. Fetch Products ---
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/agent/products", {
        headers: { Accept: "application/json" },
      })

      const data = await res.json()

      if (data.success) {
        setProducts(data.products)
      } else {
        toast.error(data.message || "Failed to load products")
      }
    } catch {
      toast.error("Network error loading products")
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    void fetchCsrfCookie()
    void fetchProducts()
  }, [])

  const handleRefresh = () => {
    setSyncing(true)
    fetchProducts()
  }

  // -------------------------------
  // Start Edit
  // -------------------------------
  const startEdit = (p: ProductType) => {
    setEditingId(p.id)
    setForm({ added_amount: p.added_amount ?? "" })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ added_amount: "" })
  }

  // -------------------------------
  // Save Updated Price (Fixed CSRF)
  // -------------------------------
  const save = async (id: number) => {
    if (form.added_amount === "") {
      toast.error("Enter an amount to add.")
      return
    }

    // 1. Get Token Manually
    const csrfToken = getCookieToken();
    
    if (!csrfToken) {
      toast.error("Session token missing. Please refresh the page.");
      return;
    }

    setSavingId(id)

    try {
      // 2. Send Request with X-XSRF-TOKEN and credentials
      const res = await fetch(`/agent/products/${id}/update-margin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": csrfToken, // Changed from X-CSRF-TOKEN
        },
        credentials: "same-origin", // Important for cookies
        body: JSON.stringify({
          added_amount: form.added_amount,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success("✅ Price updated successfully")

        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  added_amount: form.added_amount as number,
                  agent_price: data.agent_price,
                  profit: form.added_amount as number,
                }
              : p
          )
        )

        cancelEdit()
      } else {
        toast.error(data.message || "❌ Unable to update")
      }
    } catch (error) {
      console.error(error)
      toast.error("❌ Error updating price")
    } finally {
      setSavingId(null)
    }
  }

  // -------------------------------
  // UI Loading
  // -------------------------------
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16 text-white">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading products...
      </div>
    )
  }

  // -------------------------------
  // No items
  // -------------------------------
  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white space-y-4">
        <p>No products available.</p>
        <button
          onClick={handleRefresh}
          disabled={syncing}
          className="flex items-center gap-2 bg-emerald-600 px-4 py-2 rounded-lg text-white hover:bg-emerald-700 transition text-sm disabled:opacity-60"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          {syncing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    )
  }

  // -------------------------------
  // MAIN UI
  // -------------------------------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Data Prices</h2>

        <button
          onClick={handleRefresh}
          disabled={syncing}
          className="flex items-center gap-2 bg-emerald-600 px-4 py-2 rounded-lg text-white hover:bg-emerald-700 transition text-sm disabled:opacity-60"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          {syncing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* TABLE */}
      <div className="hidden md:block overflow-x-auto bg-white/5 border border-white/10 rounded-xl shadow-lg">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-white/10 text-left text-slate-200">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Capacity</th>
              <th className="p-3">Admin Price</th>
              <th className="p-3">Your Added</th>
              <th className="p-3">Final Price</th>
              <th className="p-3">Profit</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-white/10 hover:bg-white/5 transition">
                <td className="p-3 text-white font-medium">{p.name}</td>
                <td className="p-3 text-slate-400">{p.capacity || "-"}</td>
                <td className="p-3 text-blue-400">
                  ₵{Number(p.admin_agent_price ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-slate-300">
                  ₵{Number(p.added_amount ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-indigo-400 font-semibold">
                  ₵{Number(p.agent_price ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-green-400 font-semibold">
                  +₵{Number(p.profit ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-center">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-center focus:ring-1 focus:ring-emerald-500"
                        value={form.added_amount}
                        onChange={(e) =>
                          setForm({
                            added_amount:
                              e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      />

                      <button
                        onClick={() => save(p.id)}
                        disabled={savingId === p.id}
                        className="bg-emerald-600 px-3 py-1 rounded text-white disabled:opacity-60 flex items-center"
                      >
                        {savingId === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </button>

                      <button
                        onClick={cancelEdit}
                        className="text-slate-300 px-2 py-1 hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(p)}
                      className="p-1.5 rounded hover:bg-white/10 text-slate-300 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="grid gap-4 md:hidden">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-md text-slate-200"
          >
            <div className="flex justify-between">
              <h3 className="font-semibold text-white">{p.name}</h3>
              <span className="text-sm text-slate-400">{p.capacity}</span>
            </div>

            <div className="mt-2 text-sm space-y-1">
              <p>
                Admin:{" "}
                <span className="text-blue-400">
                  ₵{Number(p.admin_agent_price ?? 0).toFixed(2)}
                </span>
              </p>

              <p>
                Your Added: ₵{Number(p.added_amount ?? 0).toFixed(2)}
              </p>

              <p>
                Final Price:{" "}
                <span className="text-indigo-400">
                  ₵{Number(p.agent_price ?? 0).toFixed(2)}
                </span>
              </p>

              <p>
                Profit:{" "}
                <span className="text-green-400 font-semibold">
                  +₵{Number(p.profit ?? 0).toFixed(2)}
                </span>
              </p>
            </div>

            <div className="mt-3 text-right">
              {editingId === p.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="number"
                    className="px-2 py-2 bg-white/5 border border-white/10 rounded text-white focus:ring-1 focus:ring-emerald-500"
                    value={form.added_amount}
                    onChange={(e) =>
                      setForm({
                        added_amount:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => save(p.id)}
                      disabled={savingId === p.id}
                      className="bg-emerald-600 px-4 py-1.5 text-white rounded flex items-center gap-2 disabled:opacity-60"
                    >
                      {savingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </button>

                    <button
                      onClick={cancelEdit}
                      className="text-slate-300 px-3 py-1.5 hover:text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(p)}
                  className="mt-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-slate-200 transition flex items-center gap-1 inline-flex"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
import React, { useEffect, useMemo, useCallback, useState } from "react"
import axios from "axios"
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Clock, Loader2, Search, XCircle } from "lucide-react"
import { toast } from "sonner"

interface TransactionRow {
  id: string
  order_id: number | null
  transaction_id: number | null
  source: "order" | "transaction" | "wallet"
  reference: string | null
  user_name: string
  email?: string | null
  created_at: string | null
  network: string | null
  recipient: string | null
  data_volume: string | null
  amount: number
  currency: string
  payment_status: "success" | "pending" | "failed" | string
  status: "completed" | "processing" | "pending" | "failed" | string
  type: string | null
  description?: string | null
}

const statusClass = (status: string) => {
  const normalized = status?.toLowerCase() ?? ""

  if (["success", "successful", "completed", "paid"].includes(normalized)) {
    return "bg-green-900/50 text-green-300"
  }

  if (["failed", "error", "declined", "abandoned", "reversed"].includes(normalized)) {
    return "bg-red-900/50 text-red-300"
  }

  if (normalized === "processing") {
    return "bg-blue-900/50 text-blue-300"
  }

  return "bg-yellow-900/50 text-yellow-300"
}

const statusIcon = (status: string) => {
  const normalized = status?.toLowerCase() ?? ""

  if (["success", "successful", "completed", "paid"].includes(normalized)) {
    return <CheckCircle size={12} />
  }

  if (["failed", "error", "declined", "abandoned", "reversed"].includes(normalized)) {
    return <XCircle size={12} />
  }

  return <Clock size={12} />
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A"

  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const PER_PAGE_OPTIONS = [5, 10, 25, 50, 100, 200]

const TransactionsTable: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(5)

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)

      try {
        const response = await axios.get("/admin/transactions")
        setTransactions(response.data.transactions || [])
      } catch (error) {
        console.error("Failed to load admin transactions:", error)
        toast.error("Failed to load transactions.")
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const filteredTransactions = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase()

    return transactions.filter((transaction) => {
      const status = transaction.status?.toLowerCase() ?? ""
      const paymentStatus = transaction.payment_status?.toLowerCase() ?? ""
      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter ||
        paymentStatus === statusFilter

      if (!matchesStatus) return false
      if (!lowerTerm) return true

      return [
        transaction.reference,
        transaction.user_name,
        transaction.email,
        transaction.network,
        transaction.recipient,
        transaction.data_volume,
        transaction.type,
        transaction.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(lowerTerm))
    })
  }, [searchTerm, statusFilter, transactions])

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  const totalFiltered = filteredTransactions.length
  const lastPage = Math.max(1, Math.ceil(totalFiltered / perPage))
  const safePage = Math.min(page, lastPage)
  const startIndex = (safePage - 1) * perPage
  const endIndex = Math.min(startIndex + perPage, totalFiltered)
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, lastPage)))
  }, [lastPage])

  const changePerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage)
    setPage(1)
  }, [])

  const getPageNumbers = useCallback(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2))
    let end = Math.min(lastPage, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }, [safePage, lastPage])

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="block w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-3 text-sm text-slate-300 placeholder-slate-500 shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search ref, user, recipient, network..."
            value={searchTerm}
            onChange={(event) => { setSearchTerm(event.target.value); setPage(1) }}
          />
        </div>

        <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1 text-sm">
          {["all", "success", "pending", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1) }}
              className={`rounded-md px-3 py-2 capitalize transition ${
                statusFilter === status
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50 shadow-2xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-white/70">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-500">
            <AlertCircle className="mb-3 h-12 w-12 opacity-50" />
            <p>No transactions found.</p>
          </div>
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm text-slate-400">
            <thead className="bg-slate-800/95 text-xs uppercase text-white shadow-sm backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Payment</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginatedTransactions.map((transaction) => (
                <tr key={transaction.id} className="transition-colors hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-white">
                    {transaction.reference || "N/A"}
                    <div className="mt-0.5 text-xs text-slate-500">
                      {formatDate(transaction.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-200">{transaction.user_name}</div>
                    {transaction.email && (
                      <div className="text-xs text-slate-500">{transaction.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">{transaction.recipient || "N/A"}</div>
                    <div className="text-xs text-slate-500">
                      {transaction.network || "Transaction"} {transaction.data_volume || ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-green-400">
                    {transaction.currency} {Number(transaction.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass(transaction.payment_status)}`}>
                        {statusIcon(transaction.payment_status)}
                        {transaction.payment_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass(transaction.status)}`}>
                        {statusIcon(transaction.status)}
                        {transaction.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-slate-700/50 px-2 py-1 text-xs capitalize text-slate-200">
                      {transaction.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalFiltered > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => changePerPage(Number(e.target.value))}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-white"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>
              {startIndex + 1}–{endIndex} of {totalFiltered}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="rounded p-1 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            {getPageNumbers().map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`rounded px-2.5 py-1 ${
                  p === safePage
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-700 text-slate-400"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= lastPage}
              className="rounded p-1 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionsTable

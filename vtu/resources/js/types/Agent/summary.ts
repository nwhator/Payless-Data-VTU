export interface AgentStats {
  totalSales: number
  totalPurchases: number
  totalCommissions: number
  walletBalance: number
  pendingWithdrawals: number
  apiStatus: "Active" | "Inactive"
}

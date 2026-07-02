export interface AgentStats {
  totalSales: number
  totalPurchases: number
  totalCommissions: number
  walletBalance: number
  pendingWithdrawals: number
  apiStatus: "Active" | "Inactive"
}

export interface Transaction {
  id: number
  amount: number
  type: string
  status: string
  created_at: string
}

export interface Product {
  id: number
  name: string
  category?: string
  price: number
  agent_price?: number
  currency?: string
}

export interface Commission {
  id: number
  amount: number
  description: string
  created_at: string
}

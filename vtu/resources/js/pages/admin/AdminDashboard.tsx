import React, { useState, useEffect } from "react"
import axios from "axios"
import Sidebar from "@/components/Admin/Sidebar"
import Navbar from "@/components/Admin/Navbar"
import DashboardSummary from "@/components/Admin/DashboardSummary"
import AgentRequests from "@/components/Admin/AgentRequests"
import PricesAndProfit from "@/components/Admin/PricesAndProfit"
import UserAndWalletManagement from "@/components/Admin/UserAndWalletManagement"
import ProfileSettings from "@/components/Admin/ProfileSettings"
import WithdrawalRequests from "@/components/Admin/WithdrawalRequests"
import SendNotification from "@/components/Admin/SendNotification"
import AdminPurchase from "@/components/Admin/AdminPurchase"
import TransactionsTable from "@/components/Admin/TransactionsTable"

import { toast } from "sonner"

interface Agent {
  id: number
  name: string
  email: string
}

const AdminDashboard: React.FC = () => {
  const [active, setActive] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [sidebarOpen])

  // Load agents automatically when Notifications tab is opened
  useEffect(() => {
    const fetchAgents = async () => {
      if (active !== "notifications") return

      try {
        setLoadingAgents(true)
        const { data } = await axios.get("/admin/notifications")
        setAgents(data.agents || [])
      } catch (err) {
        toast.error("Failed to load agents")
      } finally {
        setLoadingAgents(false)
      }
    }

    fetchAgents()
  }, [active])

  return (
    <div className="min-h-screen bg-[#0B1C24] text-white flex relative">
      <Sidebar
        active={active}
        setActive={(k) => {
          setActive(k)
          setSidebarOpen(false)
        }}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-20 lg:hidden bg-black/40 transition-opacity ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      <div className="flex-1 min-w-0 lg:ml-64 transition-all duration-300">
        <Navbar
          active={active}
          setActive={setActive}
          onMenuClick={() => setSidebarOpen((s) => !s)}
        />

        <main className="p-4 sm:p-6">
          {active === "dashboard" && (
            <DashboardSummary setActive={setActive} />
          )}

          {active === "users" && <UserAndWalletManagement />}

          {active === "requests" && <AgentRequests />}

          {active === "pricing" && <PricesAndProfit />}

          {active === "wallets" && <WithdrawalRequests />}

          {active === "notifications" && (
            <div>
              {loadingAgents ? (
                <div className="text-slate-400 text-center py-10">Loading agents...</div>
              ) : (
                <SendNotification />
              )}
            </div>
          )}

          {active === "settings" && <ProfileSettings />}

          {active === "purchase" && <AdminPurchase />}

          {active === "transactions" && <TransactionsTable />}

          {["api", "reports"].includes(active) && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl text-slate-400">
              Coming soon...
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard

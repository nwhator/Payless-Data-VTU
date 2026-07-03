// components/Admin/Sidebar.tsx
import React from "react"
import { Link, usePage } from "@inertiajs/react"
import {
  LayoutDashboard,
  DollarSign,
  Users,
  ListChecks,
  Settings,
  Wifi,
  LogIn,
  BarChart,
  CreditCard,
  Activity,
} from "lucide-react"

interface SidebarProps {
  active: string
  setActive: (s: string) => void
  mobileOpen?: boolean // new, optional
  onClose?: () => void // new, optional
}

const Sidebar: React.FC<SidebarProps> = ({ active, setActive, mobileOpen = false, onClose }) => {
    
    const { url } = usePage()
    
  const navSections = [
    {
      title: "MAIN",
      items: [{ name: "Dashboard", icon: LayoutDashboard, key: "dashboard" }],
    },
    {
      title: "USER & FINANCE",
      items: [
        { name: "Users Management", icon: Users, key: "users" },
        { name: "Agent Requests", icon: Users, key: "requests" },
        { name: "Prices & Profit", icon: DollarSign, key: "pricing" },
        { name: "Withdrawal Requests", icon: CreditCard, key: "wallets" },
        { name: "Transactions", icon: ListChecks, key: "transactions" },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { name: "Purchase Data", icon: LogIn, key: "purchase" },
        { name: "Send Notification", icon: Activity, key: "notifications" },
        { name: "API & System", icon: Wifi, key: "api" },
        { name: "Reports & Analytics", icon: BarChart, key: "reports" },
        { name: "Settings", icon: Settings, key: "settings" },
      ],
    },
  ]

  return (
    <aside
      id="sidebar"
      className={`w-64 bg-[#001A23] border-r border-white/10 p-4 fixed h-full z-50 transition-transform flex flex-col
    ${mobileOpen ? "translate-x-0 pt-5" : "-translate-x-full "} lg:translate-x-0 `}
    >
      <div className="p-2 border-b border-gray-800">
        <Link href={url} className="flex items-center gap-2">
          <img
            src="/assets/images/logo.png"
            alt="Logo"
            className="w-10 h-10 object-contain"
          />
          <h3 className="font-bold text-xl text-white">Payless Data</h3>
        </Link>

        <p className="text-sm text-gray-400 mt-1">Admin Control</p>
      </div>

      {/* Scrollable container */}
      <div
        className="flex-1 overflow-y-auto pr-2"
        onWheel={(e) => e.stopPropagation()}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
          /* hide scrollbar for webkit */
          #sidebar div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <nav className="space-y-6">
          {navSections.map((section, index) => (
            <div key={index}>
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActive(item.key)
                      // close on mobile if handler provided
                      if (onClose) onClose()
                      // preserve your original behavior if needed:
                      // document.getElementById("sidebar")?.classList.add("-translate-x-full")
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-sm font-medium ${
                      active === item.key
                        ? "bg-white/10 text-[#00C4FF] shadow-lg border-l-4 border-[#00C4FF]"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <item.icon size={20} />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar

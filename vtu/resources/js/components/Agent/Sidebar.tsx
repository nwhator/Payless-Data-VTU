import React from "react"
import { Link, usePage } from "@inertiajs/react"
import axios from "axios" //  Import axios
import {
  LayoutDashboard,
  CreditCard,
  ShoppingBag,
  BarChart2,
  DollarSign,
  User,
  HelpCircle,
  LogOut,
  Activity,
  Store,
} from "lucide-react"

interface SidebarProps {
  active: string
  setActive: (s: string) => void
  mobileOpen?: boolean
  onClose?: () => void
  agentId?: string // kept for context
}

const Sidebar: React.FC<SidebarProps> = ({
  active,
  setActive,
  mobileOpen = false,
  onClose,
}) => {
    
    const { url } = usePage()
    
  const navSections = [
    {
      title: "MAIN",
      items: [
        { name: "Overview", icon: LayoutDashboard, key: "overview" },
        { name: "My Store", icon: Store, key: "store" },
        { name: "Prices & Profit", icon: DollarSign, key: "pricing" },
        { name: "Data Purchases", icon: ShoppingBag, key: "purchases" },
        { name: "Commissions", icon: DollarSign, key: "commissions" },
      ],
    },
    {
      title: "TOOLS",
      items: [
        { name: "My Wallet", icon: CreditCard, key: "wallet" },
        { name: "Sales Stats", icon: BarChart2, key: "reports" },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        { name: "Profile Settings", icon: User, key: "profile" },
        { name: "Support Center", icon: HelpCircle, key: "support" },
        { name: "Logout", icon: LogOut, key: "logout" },
      ],
    },
  ]

  // Function to handle POST request for logout
  const handleLogout = async () => {
    try {
      // 1. Send the POST request to the backend.
      // This invalidates the session on the server.
      await axios.post('/agent/logout');

      // 2. If the request succeeds (200 OK): Manually redirect the user.
      window.location.href = "/login"; // Or wherever your agent login page is.

    } catch (error) {
      // 3. Handle errors (e.g., network failure, or server returning non-200)
      console.error("Logout failed:", error);
      // Optional: You might still want to redirect even on error, as a last resort
      // window.location.href = "/agent/login";
    }
  }

  return (
    <aside
      id="sidebar"
      className={`w-64 bg-[#001A23] border-r border-white/10 p-4 fixed h-full z-50 transition-transform flex flex-col
      ${mobileOpen ? "translate-x-0 pt-5" : "-translate-x-full"} lg:translate-x-0`}
    >
      {/* Logo / Header */}
      <div className="p-2 border-b border-gray-800">
        <Link href={url} className="flex items-center gap-2">
          <img
            src="/assets/images/logo.png"
            alt="Logo"
            className="w-10 h-10 object-contain"
          />
          <h3 className="font-bold text-xl text-white">Smart Top-Up</h3>
        </Link>

        <p className="text-sm text-gray-400 mt-1">Agent Control</p>
      </div>

      {/* Scrollable container */}
      <div
        className="flex-1 overflow-y-auto pr-2"
        onWheel={(e) => e.stopPropagation()}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`#sidebar div::-webkit-scrollbar { display: none; }`}</style>

        {/* Navigation */}
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
                      if (item.key === "logout") {
                        handleLogout() // 👈 Now sends a POST request
                        if (onClose) onClose()
                        return
                      }
                      setActive(item.key)
                      if (onClose) onClose()
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
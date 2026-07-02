import React from "react"
import { router } from "@inertiajs/react"
import { LogOut } from "lucide-react"

const Dashboard: React.FC = () => {
  const handleLogout = () => {
    router.post("/logout") // Laravel route for logout (POST request)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1C24] text-white">
      <h1 className="text-3xl font-bold mb-8">
        Hello, welcome to the dashboard!
      </h1>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-all"
      >
        <LogOut size={20} />
        Logout
      </button>
    </div>
  )
}

export default Dashboard

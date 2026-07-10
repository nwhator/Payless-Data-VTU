import { usePage } from "@inertiajs/react"
import type { SharedData } from "@/types"
import React, { useState, useEffect, useRef } from "react" // Import useRef and useEffect
import { Bell, Settings, LogOut, ChevronDown, Menu } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getTitle } from "@/components/Admin/utils"
import axios from "axios"

interface NavbarProps {
  active: string
  setActive: (value: string) => void
  onMenuClick?: () => void
}

export default function Navbar({ active, setActive, onMenuClick }: NavbarProps) {
  const { props } = usePage<{ auth: SharedData["auth"] }>()
  const admin = props.auth.user
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // 💡 FIX 1: Create a ref for the dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null)

  const initials = admin?.name
    ? admin.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AR"

  const handleLogout = async () => {
    try {
      // 1. Send the POST request to the backend.
      // This invalidates the session on the server.
      await axios.post('/admin/logout');

      // 2. If the request succeeds (200 OK): Manually redirect the user.
      window.location.href = "/admin"; // Or wherever your agent login page is.

    } catch (error) {
      // 3. Handle errors (e.g., network failure, or server returning non-200)
      console.error("Logout failed:", error);
      // Optional: You might still want to redirect even on error, as a last resort
      // window.location.href = "/agent/login";
    }
  }

  //  Outside Click Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the dropdown is open AND the click is outside the dropdown container, close it
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    // Attach the event listener when the dropdown is open
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    // Clean up the event listener when the component unmounts or dropdown closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownOpen])


  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between w-full px-4 sm:px-6 py-3 bg-[#001A23] border-b border-white/10 shadow-lg">
      
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Hamburger on mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-300 hover:text-white transition"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="text-gray-300 text-sm sm:text-base">
          Hello, <span className="font-semibold text-white">{admin?.name || "Admin Root"}</span>
        </div>
      </div>

      {/* Center Section (Title) */}
      <div className="hidden sm:block text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#00C4FF] to-[#36E5B6]">
        {getTitle(active)}
      </div>

      {/* Right Section (Profile/Notifications) */}
      <div className="flex items-center gap-5 relative">
        <div className="relative cursor-pointer">
          <Bell className="w-5 h-5 text-gray-300 hover:text-white transition" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
            1
          </span>
        </div>

        {/* 💡 FIX 3: Change to onClick toggle and use ref */}
        <div
          ref={dropdownRef} // Attach the ref here
          className="relative flex items-center gap-2 cursor-pointer"
          onClick={() => setDropdownOpen((prev) => !prev)} // Toggle state on click
          // Optional: Keep mouse enter/leave for desktop hover effect without clicking, 
          // but ensure touch behavior overrides this or is handled by onClick
          onMouseEnter={() => window.innerWidth > 1024 && setDropdownOpen(true)} // Desktop only
          onMouseLeave={() => window.innerWidth > 1024 && setDropdownOpen(false)} // Desktop only
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00C4FF] to-[#36E5B6] text-[#001A23] flex items-center justify-center text-sm font-bold shadow-md">
            {initials}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${
              dropdownOpen ? "rotate-180 text-white" : ""
            }`}
          />

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 bg-[#002C3A] border border-white/10 rounded-md w-44 py-2 shadow-xl z-50"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from propagating to the parent div
                    setActive("settings");
                    setDropdownOpen(false); // Close after click
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-[#00C4FF]" /> Settings
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from propagating
                    handleLogout();
                    setDropdownOpen(false); // Close after click
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  )
}
import { usePage } from "@inertiajs/react"
import React, { useState, useEffect, useRef } from "react" // 💡 FIX: Import useEffect and useRef
import { LogOut, User, ChevronDown, Menu } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getTitle } from "@/components/Agent/utils"
import axios from "axios"

interface NavbarProps {
  active: string
  setActive: (value: string) => void
  onMenuClick?: () => void
}

export default function Navbar({ active, setActive, onMenuClick }: NavbarProps) {
  const { props } = usePage<{ auth: { user: { name: string } } }>()
  const agent = props.auth?.user
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // 💡 FIX 1: Create a ref for the dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null)

  const initials = agent?.name
    ? agent.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AG"

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

  // 💡 FIX 2: Outside Click Handler
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
    <nav className="sticky top-0 z-40 flex items-center justify-between w-full px-6 py-3 bg-[#001A23] border-b border-white/10 shadow-lg">
      
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Hamburger for mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-300 hover:text-white transition"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="text-gray-300 text-sm sm:text-base">
          Hello, <span className="font-semibold text-white">{agent?.name || "Agent User"}</span>
        </div>
      </div>

      {/* Page title */}
      <div className="hidden sm:block text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#00C4FF] to-[#36E5B6]">
        {getTitle(active)}
      </div>

      {/* Right section */}
      {/* 💡 FIX 3: Use ref and onClick toggle */}
      <div
        ref={dropdownRef} // Attach the ref here
        className="relative flex items-center gap-2 cursor-pointer"
        onClick={() => setDropdownOpen((prev) => !prev)} // Toggle state on click
        // Remove onMouseEnter/onMouseLeave completely, or scope them to large screens if needed for desktop hover
        onMouseEnter={() => window.innerWidth > 1024 && setDropdownOpen(true)}
        onMouseLeave={() => window.innerWidth > 1024 && setDropdownOpen(false)}
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
              className="absolute right-0 top-10 bg-[#002C3A] border border-white/10 rounded-md w-44 py-2 shadow-xl z-50" // Increased z-index
            >
              <button
                onClick={(e) => {
                  e.stopPropagation(); // 💡 FIX 4: Stop click propagation
                  setActive("profile");
                  setDropdownOpen(false); // Close after navigation
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-[#00C4FF]" /> Profile
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation(); // 💡 FIX 4: Stop click propagation
                  handleLogout();
                  setDropdownOpen(false); // Close immediately
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
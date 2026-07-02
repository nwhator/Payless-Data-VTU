import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"

interface NavbarProps {
  user?: {
    name: string
  }
  onLoginClick: () => void
}

export default function Navbar({ user, onLoginClick }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <a
          href="/"
          className="text-2xl font-bold text-blue-600 tracking-tight hover:text-blue-700 transition-colors"
        >
          Smart<span className="text-gray-900">Top-Up</span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6">
          <a
            href="/#plans"
            className="text-gray-700 hover:text-blue-600 transition-colors"
          >
            Plans
          </a>
          <a
            href="/#about"
            className="text-gray-700 hover:text-blue-600 transition-colors"
          >
            About
          </a>

          {user ? (
            <a
              href="/dashboard"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Dashboard
            </a>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Login / Register
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-700 hover:text-blue-600 transition"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-sm"
          >
            <div className="px-4 py-3 space-y-3">
              <a
                href="/#plans"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setMenuOpen(false)}
              >
                Plans
              </a>
              <a
                href="/#about"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setMenuOpen(false)}
              >
                About
              </a>

              {user ? (
                <a
                  href="/dashboard"
                  className="block bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition"
                >
                  Dashboard
                </a>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onLoginClick()
                  }}
                  className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Login / Register
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

import { useForm, usePage } from "@inertiajs/react"
import type { SharedData } from "@/types"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Save, Loader2, Menu } from "lucide-react"
import { toast } from "sonner"
import Sidebar from "@/components/Admin/Sidebar"
import Navbar from "@/components/Admin/Navbar"

export default function Profile() {
  const { props } = usePage<{ auth: SharedData["auth"] }>()
  const admin = props.auth.user

  const { data, setData, post, processing, errors, reset } = useForm({
    name: admin?.name || "",
    email: admin?.email || "",
    password: "",
    password_confirmation: "",
  })

  const [success, setSuccess] = useState(false)
  const [active, setActive] = useState("Profile")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [sidebarOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    post("/admin/profile/update", {
      onSuccess: () => {
        toast.success("Profile updated successfully")
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        reset("password", "password_confirmation")
      },
      onError: () => {
        toast.error("Something went wrong")
      },
      preserveScroll: true,
      preserveState: true,
    })
  }

  return (
    <div className="min-h-screen bg-[#001A23] text-white flex relative">
      {/* Sidebar */}
      <Sidebar
        active={active}
        setActive={(k) => { setActive(k); setSidebarOpen(false) }}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-20 lg:hidden bg-black/40 transition-opacity ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-[#002C3A] text-gray-300 hover:text-white transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Navbar */}
        <Navbar active={active} setActive={setActive} onMenuClick={() => setSidebarOpen((s) => !s)} />

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex items-center justify-center p-6 sm:p-10"
        >
          <div className="w-full max-w-2xl bg-[#001A23]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-lg">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00C4FF] to-[#36E5B6] mb-6">
              Admin Profile Settings
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Full Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                  className="w-full bg-[#002C3A] text-white border border-white/10 rounded-md px-4 py-2.5 focus:ring-1 focus:ring-[#00C4FF] focus:outline-none"
                />
                {errors.name && (
                  <p className="text-red-400 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData("email", e.target.value)}
                  className="w-full bg-[#002C3A] text-white border border-white/10 rounded-md px-4 py-2.5 focus:ring-1 focus:ring-[#00C4FF] focus:outline-none"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* Password */}
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={data.password}
                    onChange={(e) => setData("password", e.target.value)}
                    className="w-full bg-[#002C3A] text-white border border-white/10 rounded-md px-4 py-2.5 focus:ring-1 focus:ring-[#00C4FF] focus:outline-none"
                  />
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={data.password_confirmation}
                    onChange={(e) =>
                      setData("password_confirmation", e.target.value)
                    }
                    className="w-full bg-[#002C3A] text-white border border-white/10 rounded-md px-4 py-2.5 focus:ring-1 focus:ring-[#00C4FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#00C4FF] to-[#36E5B6] text-[#001A23] font-semibold px-5 py-2.5 rounded-md w-full sm:w-auto hover:opacity-90 transition disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>

            {success && (
              <p className="text-green-400 text-sm mt-4">
                ✅ Your profile details were updated successfully.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

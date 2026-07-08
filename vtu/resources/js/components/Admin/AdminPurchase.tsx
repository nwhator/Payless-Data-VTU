import React, { useState, useEffect } from "react"
import { usePage } from "@inertiajs/react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AuthUser {
  id: number
  name: string
  role: string
}

interface PageProps {
  auth: {
    user: AuthUser
  }
  [key: string]: unknown
}

interface Agent {
  id: number
  name: string
}

interface Product {
  id: number
  name: string
  category?: string
  price: number
  currency: string
  customer_price: number
  agent_price: number
}

interface SectionProps {
  title: string
  type: "customer" | "agent"
  color: string
  openSection: "customer" | "agent" | null
  onToggle: (section: "customer" | "agent") => void
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = ({
  title,
  type,
  color,
  openSection,
  onToggle,
  children,
}) => (
  <div className="bg-white/10 border border-white/10 rounded-xl overflow-hidden shadow-md backdrop-blur-md">
    <button
      onClick={() => onToggle(type)}
      className={`w-full flex justify-between items-center px-6 py-4 text-left text-lg font-semibold ${color} transition-colors`}
    >
      <span>{title}</span>
      {openSection === type ? <ChevronUp /> : <ChevronDown />}
    </button>

    {openSection === type && (
      <div className="p-6 border-t border-white/10 bg-[#0F1E27]/60 space-y-5">{children}</div>
    )}
  </div>
)

const AdminPurchase: React.FC = () => {
  const { auth } = usePage<PageProps>().props
  const user = auth.user

  const [openSection, setOpenSection] = useState<"customer" | "agent" | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  // ✅ Separate forms to prevent overlap
  const [customerForm, setCustomerForm] = useState({
    buyer_id: user.id.toString(),
    product_id: "",
    customer_phone: "",
  })

  const [agentForm, setAgentForm] = useState({
    buyer_id: user.id.toString(),
    agent_id: "",
    product_id: "",
    customer_phone: "",
  })

  const getCsrf = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ""

  // ✅ Fetch products & agents
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, agentsRes] = await Promise.all([
          fetch("/admin/products", { headers: { Accept: "application/json" } }),
          fetch("/admin/agents", { headers: { Accept: "application/json" } }),
        ])

        const productsData = await productsRes.json()
        const agentsData = await agentsRes.json()

        if (productsData.success) setProducts(productsData.products)
        else toast.error("⚠️ Failed to load products")

        if (agentsData.success) setAgents(agentsData.agents)
        else toast.error("⚠️ Failed to load agents")
      } catch {
        toast.error("⚠️ Network error loading products or agents")
      }
    }
    loadData()
  }, [])

  // ✅ Handle purchase
  const handleSubmit = async (type: "customer" | "agent") => {
    setLoading(true)
    try {
      const payload = type === "customer" ? customerForm : agentForm

      const res = await fetch("/admin/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrf(),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(data.message || "✅ Purchase successful!")
        if (type === "customer") {
          setCustomerForm({ buyer_id: user.id.toString(), product_id: "", customer_phone: "" })
        } else {
          setAgentForm({
            buyer_id: user.id.toString(),
            agent_id: "",
            product_id: "",
            customer_phone: "",
          })
        }
      } else {
        toast.error(data.message || "❌ Purchase failed.")
      }
    } catch {
      toast.error("⚠️ Error processing purchase.")
    } finally {
      setLoading(false)
    }
  }

  const toggle = (section: "customer" | "agent") =>
    setOpenSection(openSection === section ? null : section)

  return (
    <div className="space-y-6">
      {/* Purchase for Customer */}
      <Section
        title="📱 Purchase Data for Customer"
        type="customer"
        color="hover:bg-blue-900/20"
        openSection={openSection}
        onToggle={toggle}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm text-slate-300">Product</label>
            <select
              className="w-full bg-[#0F1E27] text-white border border-white/20 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              style={{ colorScheme: "dark" }}
              value={customerForm.product_id}
              onChange={(e) => setCustomerForm({ ...customerForm, product_id: e.target.value })}
            >
              <option value="" className="bg-[#0F1E27] text-slate-300">
                Select Product
              </option>
              {products.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-[#0F1E27] text-white hover:bg-blue-900"
                >
                  {p.name} — {p.customer_price} {p.currency}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1 text-sm text-slate-300">Customer Phone</label>
            <input
              type="text"
              className="w-full bg-white/10 text-white border border-white/10 rounded-lg px-3 py-2 placeholder:text-slate-400"
              value={customerForm.customer_phone}
              onChange={(e) =>
                setCustomerForm((prev) => ({
                  ...prev,
                  customer_phone: e.target.value,
                }))
              }
              placeholder="e.g. 0241234567"
            />
          </div>
        </div>

        <button
          onClick={() => handleSubmit("customer")}
          disabled={loading}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 flex justify-center items-center gap-2 font-medium"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Purchase"}
        </button>
      </Section>

      {/* Purchase for Agent’s Customer */}
      <Section
        title="👥 Purchase Data for Agent’s Customer"
        type="agent"
        color="hover:bg-green-900/20"
        openSection={openSection}
        onToggle={toggle}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm text-slate-300">Agent</label>
            <select
              className="w-full bg-[#0F1E27] text-white border border-white/20 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              style={{ colorScheme: "dark" }}
              value={agentForm.agent_id}
              onChange={(e) => setAgentForm({ ...agentForm, agent_id: e.target.value })}
            >
              <option value="" className="bg-[#0F1E27] text-slate-300">
                Select Agent
              </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#0F1E27] text-white hover:bg-green-900">
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm text-slate-300">Product</label>
            <select
              className="w-full bg-[#0F1E27] text-white border border-white/20 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              style={{ colorScheme: "dark" }}
              value={agentForm.product_id}
              onChange={(e) => setAgentForm({ ...agentForm, product_id: e.target.value })}
            >
              <option value="" className="bg-[#0F1E27] text-slate-300">
                Select Product
              </option>
              {products.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-[#0F1E27] text-white hover:bg-green-900"
                >
                  {p.name} — {p.agent_price} {p.currency}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1 text-sm text-slate-300">Customer Phone</label>
            <input
              type="text"
              className="w-full bg-white/10 text-white border border-white/10 rounded-lg px-3 py-2 placeholder:text-slate-400"
              value={agentForm.customer_phone}
              onChange={(e) => setAgentForm({ ...agentForm, customer_phone: e.target.value })}
              placeholder="e.g. 0241234567"
            />
          </div>
        </div>

        <button
          onClick={() => handleSubmit("agent")}
          disabled={loading}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 flex justify-center items-center gap-2 font-medium"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Purchase for Agent’s Customer"}
        </button>
      </Section>
    </div>
  )
}

export default AdminPurchase

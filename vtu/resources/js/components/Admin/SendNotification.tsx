import React, { useEffect, useState } from "react"
import axios from "axios"
import { Loader2, Send, Users } from "lucide-react"
import { toast } from "sonner"

interface Agent {
  id: number
  name: string
  email: string
}

const SendNotification: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [recipients, setRecipients] = useState<string[]>(["all"])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // ✅ Fetch agents safely (SPA-friendly, production-ready)
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchAgents = async () => {
      try {
        const res = await axios.get<{ agents: Agent[] }>("/admin/notifications", {
          signal: controller.signal,
        })
        if (isMounted) setAgents(res.data.agents || [])
      } catch (error) {
        if (!axios.isCancel(error)) {
          const message =
            axios.isAxiosError(error)
              ? error.response?.data?.message || "Failed to load agents"
              : "An unexpected error occurred while fetching agents"
          toast.error(message)
        }
      } finally {
        if (isMounted) setFetching(false)
      }
    }

    fetchAgents()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  //  Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append("title", title)
    formData.append("body", body)
    if (image) formData.append("image", image)
    recipients.forEach((r, i) => formData.append(`recipients[${i}]`, r))

    try {
      await axios.post("/admin/notifications", formData)
      toast.success("✅ Notification sent successfully!")
      setTitle("")
      setBody("")
      setImage(null)
      setRecipients(["all"])
    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.message || "❌ Failed to send notification"
          : "❌ Something went wrong"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  //  Handle selecting recipients
  const toggleRecipient = (id: string) => {
    if (id === "all") {
      setRecipients(["all"])
    } else {
      setRecipients((prev) =>
        prev.includes(id)
          ? prev.filter((r) => r !== id)
          : [...prev.filter((r) => r !== "all"), id]
      )
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl max-w-5xl mx-auto w-full">
      <h2 className="text-lg font-semibold mb-4 text-[#00C4FF] flex items-center gap-2">
        <Users size={20} /> Send Notification to Agents
      </h2>

      {fetching ? (
        <div className="flex justify-center py-10 text-sm text-gray-400">
          <Loader2 className="animate-spin mr-2" /> Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center text-gray-400 py-10 border border-dashed border-white/10 rounded-lg">
          No agents available yet.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:ring-2 focus:ring-[#00C4FF]"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Message Body</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:ring-2 focus:ring-[#00C4FF]"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Attach Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Recipients</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleRecipient("all")}
                className={`px-3 py-1 rounded-lg text-sm border transition-all ${
                  recipients.includes("all")
                    ? "bg-[#00C4FF]/20 border-[#00C4FF]"
                    : "border-white/20 hover:border-[#00C4FF]/40"
                }`}
              >
                All Agents
              </button>

              {agents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleRecipient(a.id.toString())}
                  className={`px-3 py-1 rounded-lg text-sm border transition-all ${
                    recipients.includes(a.id.toString())
                      ? "bg-[#00C4FF]/20 border-[#00C4FF]"
                      : "border-white/20 hover:border-[#00C4FF]/40"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#00C4FF] text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#00C4FF]/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Send Notification
          </button>
        </form>
      )}
    </div>
  )
}

export default SendNotification

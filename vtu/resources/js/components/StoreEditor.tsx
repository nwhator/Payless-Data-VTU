import React, { useState, useCallback, useEffect } from "react"
import { X, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import ResponsiveBanner from "@/components/ResponsiveBanner"

interface StoreData {
  id?: number
  store_name: string
  store_slug: string
  description?: string
  banner_image?: string | null
  logo?: string | null
  whatsapp_number?: string | null
  whatsapp_link?: string | null
}

const staticBanners = [
  "/assets/images/banner/banner1.webp",
  "/assets/images/banner/banner2.webp",
  "/assets/images/banner/banner3.webp",
]

interface StoreEditorProps {
  store: StoreData
  onCancel: () => void
  onSaved: (updated: StoreData) => void
}

interface BannerUrls {
  large: string
  medium?: string
  small?: string
}

interface BannerData {
  urls?: BannerUrls
  text?: string
}

const StoreEditor: React.FC<StoreEditorProps> = ({ store, onCancel, onSaved }) => {
  const [formData, setFormData] = useState({
    store_name: store.store_name || "",
    store_slug: store.store_slug || "",
    store_description: store.description || "",
    whatsapp_number: store.whatsapp_number || "",
  })

  const [slugMode, setSlugMode] = useState<"static" | "generated">("static")
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [whatsappValid, setWhatsappValid] = useState(true)

  const [bannerType, setBannerType] = useState<"auto" | "static" | "none">("none")
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(
    store.banner_image || null
  )
  const [selectedStaticBanner, setSelectedStaticBanner] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    store.logo || null
  )
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [bannerData, setBannerData] = useState<BannerData>({})

  // --- HANDLE INPUT ---
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))

      if (name === "whatsapp_number") {
        const digits = value.replace(/[^0-9]/g, "")
        const valid = /^0\d{9}$/.test(digits) || /^233\d{9}$/.test(digits)
        setWhatsappValid(valid || digits.length === 0)
      }
    },
    []
  )

  // --- SLUG CONTROL ---
  const generateSlug = useCallback(() => {
    if (!formData.store_name.trim()) return
    const base = formData.store_name.trim().toLowerCase().replace(/\s+/g, "-")
    const random = Math.random().toString(36).substring(2, 6)
    const slug = `${base}-${random}`
    setFormData((prev) => ({ ...prev, store_slug: slug }))
    setSlugMode("generated")
  }, [formData.store_name])

  const makeSlugStatic = useCallback(() => setSlugMode("static"), [])

  // --- CHECK SLUG AVAILABILITY ---
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug.trim()) return setSlugAvailable(null)
    try {
        setCheckingSlug(true)
        const { data } = await axios.get(`/agent/store/check-slug?slug=${encodeURIComponent(slug)}`)
        setSlugAvailable(data.available)

        // 🕐 Clear the slug availability message after 5 seconds
        setTimeout(() => {
        setSlugAvailable(null)
        }, 5000)
    } catch {
        setSlugAvailable(null)
    } finally {
        setCheckingSlug(false)
    }
    }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (slugMode === "static" && formData.store_slug) {
        checkSlugAvailability(formData.store_slug)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [formData.store_slug, slugMode, checkSlugAvailability])

  // --- LOGO UPLOAD ---
  const handleLogoChange = useCallback((file?: File) => {
    if (!file) return
    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }, [])

  // --- STATIC BANNER PICK ---
  const pickStaticBanner = useCallback((path: string) => {
    setBannerType("static")
    setSelectedStaticBanner(path)
    setBannerPreviewUrl(path)
  }, [])

  // --- AUTO BANNER ---
  const generateAutoBanner = useCallback(async () => {
    if (!formData.store_name.trim()) {
      toast.error("Enter a store name first — it’s used in the banner.")
      return
    }
    try {
      setGenerating(true)
      const { data } = await axios.post("/agent/gen/generate-banner", {
        name: formData.store_name,
        slug: formData.store_slug,
      })
      if (data?.url) {
        setBannerType("auto")
        setBannerPreviewUrl(data.url)
        setBannerData({ urls: { large: data.url }, text: data.text })
        toast.success("✅ Auto banner generated!")
      } else toast.error("Failed to generate banner")
    } catch {
      toast.error("Error generating banner")
    } finally {
      setGenerating(false)
    }
  }, [formData.store_name, formData.store_slug])

  // --- SAVE ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        if (!whatsappValid) return toast.error("Invalid WhatsApp number")

        setSaving(true)
        const form = new FormData()
        form.append("store_name", formData.store_name)
        form.append("store_slug", formData.store_slug)
        form.append("store_description", formData.store_description)
        if (formData.whatsapp_number)
          form.append("whatsapp_number", formData.whatsapp_number)
        if (bannerPreviewUrl) form.append("banner_image", bannerPreviewUrl)
        if (logoFile) form.append("logo_file", logoFile)

        const { data } = await axios.post("/agent/store", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        if (data.success) {
          toast.success("🎉 Store saved successfully!")
          onSaved(data.store)
        } else toast.error(data.message || "Failed to save store")
      } catch {
        toast.error("Save failed")
      } finally {
        setSaving(false)
      }
    },
    [formData, bannerPreviewUrl, logoFile, onSaved, whatsappValid]
  )

  // --- WHATSAPP LINK ---
  const getWhatsappLink = useCallback(() => {
    if (!formData.whatsapp_number) return null
    const digits = formData.whatsapp_number.replace(/[^0-9]/g, "")
    const formatted =
      digits.startsWith("0") && digits.length === 10
        ? `233${digits.slice(1)}`
        : digits
    return `https://wa.me/${formatted}`
  }, [formData.whatsapp_number])

  return (
    <div className="w-full min-h-[70vh] p-3 sm:p-5 md:p-6 flex justify-center lg:items-center overflow-x-hidden">
      <div className="relative w-full max-w-[1200px] bg-[#071219] rounded-2xl border border-white/10 overflow-hidden flex flex-col lg:flex-row mx-auto shadow-2xl">

        {/* LEFT — Preview */}
        <div className="flex-1 overflow-y-auto max-h-[90vh] p-4 sm:p-6 border-b md:border-b-0 md:border-r border-white/10">
          <div className="bg-gradient-to-b from-[#06272F] to-[#041620] rounded-xl overflow-hidden">
            {/* Banner */}
            <div className="relative w-full h-44 sm:h-60 bg-slate-800/40 flex items-center justify-center">
              {bannerType === "auto" && bannerData.urls ? (
                <ResponsiveBanner urls={bannerData.urls} text={bannerData.text || ""} />
              ) : bannerPreviewUrl ? (
                <img src={bannerPreviewUrl} alt="banner" className="object-cover w-full h-full" />
              ) : (
                <span className="text-slate-500 text-sm italic">Banner preview</span>
              )}
              {/* Logo */}
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="logo" className="h-20 w-20 rounded-full object-cover border-2 border-white/10" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-white font-bold border-2 border-white/10">
                    {formData.store_name ? formData.store_name[0] : "A"}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="px-4 sm:px-6 pt-16 pb-8 text-center">
              <h2 className="text-lg sm:text-2xl font-bold text-white break-words">
                {formData.store_name || "Your Store Name"}
              </h2>
              <p className="text-slate-400 mt-2 text-sm sm:text-base">
                {formData.store_description || "Your store description goes here."}
              </p>
              <div className="mt-3 text-[#00C4FF] text-xs sm:text-sm break-all flex items-center justify-center gap-1">
                <LinkIcon size={14} className="opacity-60" />
                {formData.store_slug
                  ? `${window.location.origin}/store/${formData.store_slug}`
                  : "your-store-link"}
              </div>

              {formData.whatsapp_number && whatsappValid && (
                <div className="mt-4 flex justify-center">
                  <a
                    href={getWhatsappLink() || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center text-[#25D366] hover:text-[#1EBE57] transition"
                  >
                    <img
                      src="/assets/images/icons/whatsapp.png"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                      alt="WhatsApp"
                      className="h-6 w-6 object-contain"
                    />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="md:w-[380px] w-full overflow-auto p-5 sm:p-6 bg-[#071619]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Edit Store</h3>
            <button onClick={onCancel} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NAME */}
            <div>
              <label className="text-slate-300 text-sm">Store name</label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                className="w-full mt-1 p-3 rounded-lg bg-[#0F2A35] border border-white/10 text-white text-sm"
                placeholder="Store name"
              />
            </div>

            {/* SLUG */}
            <div>
              <label className="text-slate-300 text-sm flex justify-between items-center">
                <span>Slug</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generateSlug}
                    className={`text-xs px-2 py-1 rounded-md ${
                      slugMode === "generated"
                        ? "bg-[#4DFF8F] text-black"
                        : "bg-[#0F2A35] text-slate-300"
                    }`}
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={makeSlugStatic}
                    className={`text-xs px-2 py-1 rounded-md ${
                      slugMode === "static"
                        ? "bg-[#4DFF8F] text-black"
                        : "bg-[#0F2A35] text-slate-300"
                    }`}
                  >
                    Static
                  </button>
                </div>
              </label>
              <input
                type="text"
                name="store_slug"
                value={formData.store_slug}
                onChange={handleChange}
                disabled={slugMode === "generated"}
                className={`w-full mt-1 p-3 rounded-lg ${
                  slugMode === "generated"
                    ? "bg-[#0F2A35]/60 cursor-not-allowed"
                    : "bg-[#0F2A35]"
                } border border-white/10 text-white text-sm`}
                placeholder="store-slug"
              />
              {checkingSlug && (
                <p className="text-xs text-slate-400 mt-1">Checking availability...</p>
              )}
              {slugAvailable === true && (
                <p className="text-xs text-green-400 mt-1">✅ Slug is available</p>
              )}
              {slugAvailable === false && (
                <p className="text-xs text-red-400 mt-1">❌ Slug is already taken</p>
              )}
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="text-slate-300 text-sm">Description</label>
              <textarea
                name="store_description"
                rows={3}
                value={formData.store_description}
                onChange={handleChange}
                className="w-full mt-1 p-3 rounded-lg bg-[#0F2A35] border border-white/10 text-white text-sm"
                placeholder="Brief description"
              />
            </div>

            {/* WHATSAPP */}
            <div>
              <label className="text-slate-300 text-sm">WhatsApp Number</label>
              <input
                type="text"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleChange}
                placeholder="e.g. 024XXXXXXX"
                className="w-full mt-1 p-3 rounded-lg bg-[#0F2A35] border border-white/10 text-white text-sm"
              />
              {!whatsappValid && (
                <p className="text-xs text-red-400 mt-1">
                  Invalid number — must be Ghanaian
                </p>
              )}
            </div>

            {/* LOGO */}
            <div>
              <label className="text-slate-300 text-sm">Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && handleLogoChange(e.target.files[0])
                }
                className="mt-2 text-xs text-slate-400"
              />
              {logoPreviewUrl && (
                <img
                  src={logoPreviewUrl}
                  alt="logo preview"
                  className="h-16 w-16 mt-3 rounded-full object-cover border border-white/10"
                />
              )}
            </div>

            {/* BANNER */}
            <div>
              <label className="text-slate-300 text-sm">Banner</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={generateAutoBanner}
                  disabled={generating}
                  className={`p-3 rounded-lg border text-xs ${
                    bannerType === "auto"
                      ? "border-[#00C4FF] bg-[#00C4FF]/10"
                      : "border-white/10"
                  }`}
                >
                  {generating ? "Generating..." : "Auto Banner"}
                </button>
                <button
                  type="button"
                  onClick={() => pickStaticBanner(staticBanners[0])}
                  className={`p-3 rounded-lg border text-xs ${
                    bannerType === "static"
                      ? "border-[#00C4FF] bg-[#00C4FF]/10"
                      : "border-white/10"
                  }`}
                >
                  Static Banner
                </button>
              </div>

              {bannerType === "static" && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {staticBanners.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => pickStaticBanner(b)}
                      className={`h-16 rounded-lg overflow-hidden border ${
                        selectedStaticBanner === b
                          ? "border-[#00C4FF]"
                          : "border-white/10"
                      }`}
                    >
                      <img src={b} alt="banner" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ACTIONS */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#4DFF8F] text-black font-semibold hover:bg-[#6dff9f] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default StoreEditor

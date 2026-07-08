import React, { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "sonner"
import { motion } from "framer-motion"
import StorePreview from "./StorePreview"
import StoreSettings from "./StoreSettings"
import type { StoreData } from "../types"

interface Props {
  store: StoreData | null
  onClose: () => void
  onSaved: (store: StoreData) => void
}

const StoreModal: React.FC<Props> = ({ store, onClose, onSaved }) => {
  const [tempStore, setTempStore] = useState<StoreData>({
    store_name: "",
    store_slug: "",
    description: "",
    banner_image: "",
    logo: "",
    publish: "draft",
  })
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  useEffect(() => {
    if (store) setTempStore(store)
  }, [store])

  const handleChange = (key: keyof StoreData, value: string) =>
    setTempStore((prev) => ({ ...prev, [key]: value }))

  const handleGenerateSlug = () => {
    const slug = tempStore.store_name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
    setTempStore((prev) => ({ ...prev, store_slug: slug }))
  }

  const handleSave = async () => {
    if (!tempStore.store_name) {
      toast.error("Please enter a store name")
      return
    }

    try {
      setSaving(true)
      const formData = new FormData()
      formData.append("store_name", tempStore.store_name)
      formData.append("store_slug", tempStore.store_slug)
      formData.append("store_description", tempStore.description || "")
      formData.append("publish", tempStore.publish || "draft")

      if (logoFile) {
        formData.append("logo_file", logoFile)
      } else if (tempStore.logo && !tempStore.logo.startsWith("blob:")) {
        formData.append("logo_url", tempStore.logo)
      }

      if (bannerFile) {
        formData.append("banner_file", bannerFile)
      } else if (tempStore.banner_image && !tempStore.banner_image.startsWith("blob:")) {
        formData.append("banner_image", tempStore.banner_image)
      }

      const { data } = await axios.post("/agent/store", formData)
      if (data.success) {
        toast.success("✅ Store saved successfully!")
        onSaved(data.store)
      } else toast.error(data.message || "Failed to save store")
    } catch {
      toast.error("An error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="relative bg-[#0B1C24] w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-5xl rounded-2xl overflow-hidden border border-white/10"
      >
        <div className="flex flex-col md:flex-row h-[90vh]">
          <StorePreview store={tempStore} />
          <StoreSettings
            store={tempStore}
            onChange={handleChange}
            onGenerateSlug={handleGenerateSlug}
            onSave={handleSave}
            onLogoFile={setLogoFile}
            onBannerFile={setBannerFile}
            saving={saving}
            onClose={onClose}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default StoreModal

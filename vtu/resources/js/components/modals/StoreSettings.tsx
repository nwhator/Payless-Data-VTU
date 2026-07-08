import React, { ChangeEvent } from "react"
import type { StoreData } from "../types"
import { X } from "lucide-react"

interface Props {
  store: StoreData
  onChange: (key: keyof StoreData, value: string) => void
  onGenerateSlug: () => void
  onSave: () => void
  onClose: () => void
  onLogoFile?: (file: File) => void
  onBannerFile?: (file: File) => void
  saving: boolean
}

const StoreSettings: React.FC<Props> = ({
  store,
  onChange,
  onGenerateSlug,
  onSave,
  onClose,
  onLogoFile,
  onBannerFile,
  saving,
}) => {
  const handleFile = (e: ChangeEvent<HTMLInputElement>, key: keyof StoreData) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(key, URL.createObjectURL(file))
      if (key === "logo" && onLogoFile) onLogoFile(file)
      if (key === "banner_image" && onBannerFile) onBannerFile(file)
    }
  }

  return (
    <div className="flex-1 bg-[#0B1C24] p-6 overflow-y-auto text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Store Settings</h2>
        <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-sm text-slate-400">Store Name</label>
          <input
            type="text"
            value={store.store_name}
            onChange={(e) => onChange("store_name", e.target.value)}
            className="w-full mt-2 p-3 bg-slate-800 rounded-xl focus:outline-none text-white"
            placeholder="Enter your store name"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">Store Slug</label>
          <div className="flex mt-2 gap-2">
            <input
              type="text"
              value={store.store_slug}
              onChange={(e) => onChange("store_slug", e.target.value)}
              className="flex-1 p-3 bg-slate-800 rounded-xl focus:outline-none text-white"
              placeholder="auto-generated-store"
            />
            <button
              onClick={onGenerateSlug}
              className="bg-[#00C4FF] px-3 py-2 rounded-xl text-black text-sm font-semibold hover:bg-[#33d8ff]"
            >
              Auto
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400">Description</label>
          <textarea
            value={store.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            className="w-full mt-2 p-3 bg-slate-800 rounded-xl focus:outline-none text-white h-24 resize-none"
            placeholder="Describe your store..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm text-slate-400">Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e, "logo")}
              className="w-full mt-2 p-2 bg-slate-800 rounded-xl text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-slate-400">Banner</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e, "banner_image")}
              className="w-full mt-2 p-2 bg-slate-800 rounded-xl text-sm"
            />
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full mt-6 bg-[#4DFF8F] hover:bg-[#6dff9f] text-black font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Store"}
        </button>
      </div>
    </div>
  )
}

export default StoreSettings

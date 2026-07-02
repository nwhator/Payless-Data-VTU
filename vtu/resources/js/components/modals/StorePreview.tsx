import React from "react"
import type { StoreData } from "../types"

const StorePreview: React.FC<{ store: StoreData }> = ({ store }) => (
  <div className="flex-1 bg-[#08161E] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
    <div className="w-full max-w-sm">
      <div className="aspect-[3/1] rounded-xl bg-slate-800 mb-4 flex items-center justify-center">
        {store.banner_image ? (
          <img
            src={store.banner_image}
            alt="Banner"
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <span className="text-slate-500 text-sm">No banner image</span>
        )}
      </div>

      <div className="flex justify-center mb-4">
        {store.logo ? (
          <img
            src={store.logo}
            alt="Logo"
            className="w-20 h-20 rounded-full object-cover border-2 border-[#4DFF8F]"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
            No Logo
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        {store.store_name || "Your Store Name"}
      </h3>
      <p className="text-slate-400 text-sm mb-3 break-all">
        {store.store_slug ? `${window.location.origin}/store/${store.store_slug}` : "Store link"}
      </p>
      <p className="text-slate-300 text-sm">
        {store.description || "This is your store description preview."}
      </p>
    </div>
  </div>
)

export default StorePreview

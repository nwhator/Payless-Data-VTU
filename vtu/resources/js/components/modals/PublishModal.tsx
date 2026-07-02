import { motion } from "framer-motion"

const PublishModal = ({ onClose, onGoToPricing }: { onClose: () => void; onGoToPricing: () => void }) => (

  <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/80" />
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.95 }}
      className="relative bg-[#0B1C24] p-6 rounded-2xl max-w-md w-[90vw] text-center"
    >
      <h3 className="text-lg font-semibold text-white mb-2">Cannot publish yet</h3>
      <p className="text-slate-400 mb-5 text-sm">
        Some of your products are missing prices. Please update them before publishing.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-600"
        >
          Close
        </button>
        <button
        onClick={onGoToPricing}
        className="flex-1 py-3 rounded-xl bg-[#4DFF8F] text-black font-semibold hover:bg-[#6dff9f]"
        >
        Go to Products
        </button>

      </div>
    </motion.div>
  </motion.div>
)

export default PublishModal

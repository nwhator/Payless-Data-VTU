const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">You don’t have a store yet</h2>
    <p className="text-slate-400 mb-6 text-sm sm:text-base">
      Create your personalized store link to start selling.
    </p>
    <button
      onClick={onCreate}
      className="bg-[#4DFF8F] hover:bg-[#6dff9f] text-black font-semibold px-6 py-3 rounded-xl transition-all w-full sm:w-auto"
    >
      Create My Store
    </button>
  </div>
)

export default EmptyState

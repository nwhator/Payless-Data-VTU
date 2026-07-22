import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const NETWORK_DISPLAY: Record<string, string> = {
  MTN: "MTN",
  Telcel: "Telecel",
  Airtel: "AirtelTigo",
  Glo: "Glo",
  Vodafone: "Vodafone",
};

function getNetworkName(product: any): string {
  const raw = (product.network || "").trim();
  if (raw && NETWORK_DISPLAY[raw]) return NETWORK_DISPLAY[raw];
  if (raw) return raw;
  return "";
}

interface AgentStoreViewProps {
  store: any;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSetActive: (key: string) => void;
  products: any[];
  loading: boolean;
}

const AgentStoreView: React.FC<AgentStoreViewProps> = ({
  store,
  onPublish,
  onUnpublish,
  onDelete,
  onEdit,
  onSetActive,
  products = [],
  loading = false,
}) => {
  const [openNetwork, setOpenNetwork] = useState("");

  const groupedProducts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    products.forEach((product) => {
      const network = getNetworkName(product);
      if (!network) return;
      if (!groups[network]) groups[network] = [];
      groups[network].push(product);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const va = a.capacity_value ?? 0;
        const vb = b.capacity_value ?? 0;
        return va - vb;
      });
    });

    return groups;
  }, [products]);

  const PRIMARY_ACCENT = "#FFCC00";
  const CARD_BACKGROUND = "#1E1E24";
  const TEXT_LIGHT = "#E0E0E0";

  const hoverEffect = {
    initial: { scale: 1, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" },
    hover: {
      scale: 1.05,
      boxShadow: "0 10px 30px rgba(255, 204, 0, 0.5)",
      transition: { duration: 0.3 },
    },
    tap: { scale: 0.98 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="max-w-3xl mx-auto bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/10">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 text-white">
          {store.store_name}
        </h2>
        <p className="text-slate-400 mb-4 text-sm sm:text-base">
          {store.description}
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <a
            href={`${window.location.origin}/store/${store.store_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00C4FF] underline break-all"
          >
            {window.location.origin}/store/{store.store_slug}
          </a>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onSetActive("pricing")}
              className="px-4 py-2 rounded-xl bg-[#00C4FF] text-black font-bold hover:bg-[#33d8ff] transition-all"
            >
              Manage Pricing &amp; Networks
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {!loading && products.length === 0 ? (
          <div className="text-center text-slate-400 py-10 bg-white/5 border border-white/10 rounded-xl">
            No products available yet. Set up your pricing in the pricing tab.
          </div>
        ) : (
          Object.entries(groupedProducts).map(([network, netProducts]) => (
            <div
              key={network}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setOpenNetwork(openNetwork === network ? "" : network)
                }
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold"
                    style={{
                      backgroundColor: `${PRIMARY_ACCENT}22`,
                      color: PRIMARY_ACCENT,
                    }}
                  >
                    {network.charAt(0)}
                  </div>
                  <div>
                    <span className="text-base sm:text-lg font-semibold text-white">
                      {network}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      ({netProducts.length})
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    openNetwork === network ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {openNetwork === network && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-5 pt-3 border-t border-white/10">
                      {netProducts.map((p) => (
                        <motion.div
                          key={p.id}
                          variants={hoverEffect}
                          whileHover="hover"
                          whileTap="tap"
                          className="flex flex-col items-center p-5 rounded-2xl border transition-all duration-300 text-center"
                          style={{
                            backgroundColor: CARD_BACKGROUND,
                            color: TEXT_LIGHT,
                            borderColor: "transparent",
                          }}
                        >
                          <div
                            className="text-4xl font-black mb-1"
                            style={{ color: PRIMARY_ACCENT }}
                          >
                            {p.capacity}
                          </div>
                          <p className="text-sm font-medium opacity-70 mb-3">
                            {p.name}
                          </p>
                          <span
                            className="text-xs font-bold py-1 px-4 rounded-full uppercase tracking-wider"
                            style={{
                              backgroundColor: "rgba(255,204,0,0.2)",
                              color: PRIMARY_ACCENT,
                            }}
                          >
                            {p.validity}
                          </span>
                          <div
                            className="mt-4 pt-4 border-t w-full"
                            style={{ borderColor: "#33333A" }}
                          >
                            <p
                              className="text-lg font-bold"
                              style={{ color: TEXT_LIGHT }}
                            >
                              {p.agent_price !== null && p.agent_price > 0 ? (
                                <span>
                                  <span className="text-sm font-light opacity-80">
                                    GHS{" "}
                                  </span>
                                  {p.agent_price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              ) : (
                                "Unavailable"
                              )}
                            </p>
                            <p className="text-xs opacity-60 mt-1">Price</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default AgentStoreView;

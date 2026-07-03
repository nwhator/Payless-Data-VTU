import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  onBuy: (p: Product) => void;
  displayName: (p: Product) => string;
  displayPrice: (p: Product) => string;
  isDisplayMode?: boolean; // New prop for visual-only mode
}

const PRIMARY_ACCENT = "#FFCC00";
const CARD_BACKGROUND = "#1E1E24";
const TEXT_LIGHT = "#E0E0E0";
const TEXT_MUTED = "#94A3B8";
const CURRENCY_SIGN = "₵";

export default function ProductCard({
  product,
  onBuy,
  isDisplayMode = false,
}: Props) {
  const cardCapacityText = product.capacity || "Data";
  const cardValidityText = product.validity || "No Expiry";

  const formattedPrice = useMemo(() => {
    return `${CURRENCY_SIGN} ${product.price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [product.price]);

  // Only apply hover effects if NOT in display mode
  const hoverEffect = isDisplayMode
    ? undefined
    : {
        initial: { scale: 1, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" },
        hover: {
          scale: 1.05,
          boxShadow: "0 10px 30px rgba(255, 204, 0, 0.5)",
          transition: { duration: 0.3 },
        },
        tap: { scale: 0.98 },
      };

  const cardClasses = `
    flex flex-col items-center p-6 rounded-2xl border
    transition-all duration-300 text-center
    ${isDisplayMode ? "cursor-default opacity-80" : "cursor-pointer"}
  `;

  return (
    <motion.div
      key={product.product_code ?? product.name}
      onClick={() => !isDisplayMode && onBuy(product)}
      variants={hoverEffect}
      whileHover={!isDisplayMode ? "hover" : undefined}
      whileTap={!isDisplayMode ? "tap" : undefined}
      initial={!isDisplayMode ? "initial" : undefined}
      className={cardClasses}
      style={{
        backgroundColor: CARD_BACKGROUND,
        color: TEXT_LIGHT,
        borderColor: "transparent",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div
        className="text-5xl font-black mb-1"
        style={{ color: PRIMARY_ACCENT }}
      >
        {cardCapacityText}
      </div>

      <p
        className="text-sm font-medium opacity-70 mb-3"
        style={{ color: TEXT_MUTED }}
      >
        {product.name.includes("Airtime") ? "Airtime Top-Up" : "Data Bundle"}
      </p>

      <span
        className="text-xs font-bold py-1 px-4 rounded-full uppercase tracking-wider"
        style={{
          backgroundColor: "rgba(255, 204, 0, 0.2)",
          color: PRIMARY_ACCENT,
        }}
      >
        {cardValidityText}
      </span>

      {/* Show price + button ONLY if NOT in display mode */}
      {!isDisplayMode ? (
        <div
          className="mt-4 pt-4 border-t w-full"
          style={{ borderColor: "#33333A" }}
        >
          <p className="text-xl font-bold" style={{ color: TEXT_LIGHT }}>
            {formattedPrice}
          </p>

          <p className="text-xs opacity-60 mb-4" style={{ color: TEXT_MUTED }}>
            Price
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuy(product);
            }}
            className="w-full px-4 py-2 rounded-full text-sm font-medium shadow-lg"
            style={{
              backgroundColor: PRIMARY_ACCENT,
              color: CARD_BACKGROUND,
            }}
          >
            Buy Now
          </button>
        </div>
      ) : (
        <div
          className="mt-4 pt-4 border-t w-full"
          style={{ borderColor: "#33333A" }}
        >
          <p className="text-sm text-slate-500 font-medium">
            Available
          </p>
        </div>
      )}
    </motion.div>
  );
}

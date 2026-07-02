import React, { useState } from "react";
import { motion } from "framer-motion";
import FundWalletForm from "../FundWalletForm"; // <-- Keep your original import path

/* -----------------------------
    Type Definitions
------------------------------ */

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Wallet {
  balance: number;
}

export interface Product {
  id: number;
  name: string;
  customer_price: number;
  product_code?: string;
  capacity?: string;
  validity?: string;
}

interface Props {
  user: User;
  wallet: Wallet;
  totalPurchases: number;
  products: Product[];
  loadingProducts: boolean;
  onSetActive: (key: string) => void;

  // callback when a product is clicked
  onProductClick: (product: Product) => void;
}

/* -----------------------------
    UI Constants
------------------------------ */

const PRIMARY_ACCENT = "#FFCC00";
const CARD_BACKGROUND = "#1E1E24";
const TEXT_LIGHT = "#E0E0E0";
const TEXT_MUTED = "#94A3B8";
const CURRENCY_SIGN = "₵";

/* -----------------------------
    Utility Components
------------------------------ */

// Temporary Basic Modal Wrapper (replace with your actual modal component if you have one)
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
  
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
        onClick={onClose} 
      >
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="bg-[#2a2a33] p-8 rounded-xl shadow-2xl w-full max-w-sm"
          onClick={e => e.stopPropagation()} 
        >
          {children}
        </motion.div>
      </div>
    );
  };


// Designed Plus Icon for the Wallet Balance card
const PlusIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={3}
    stroke="currentColor" 
    className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:rotate-90"
    style={{ color: PRIMARY_ACCENT }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);


interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

function ProductCard({ product, onClick }: ProductCardProps) {
  const capacity = product.capacity ?? "Data";
  const validity = product.validity ?? "No Expiry";

  const priceFormatted = `${CURRENCY_SIGN} ${Number(product.customer_price).toFixed(2)}`;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="flex flex-col items-center p-6 rounded-2xl border cursor-pointer text-center transition"
      style={{
        backgroundColor: CARD_BACKGROUND,
        color: TEXT_LIGHT,
        borderColor: "transparent",
        boxShadow: "0 4px 15px rgba(0,0,0,0.25)",
      }}
    >
      <div className="text-5xl font-black mb-1" style={{ color: PRIMARY_ACCENT }}>
        {capacity}
      </div>

      <p className="text-sm font-medium mb-3" style={{ color: TEXT_MUTED }}>
        {product.name.includes("Airtime") ? "Airtime Top-Up" : "Data Bundle"}
      </p>

      <span
        className="text-xs font-bold py-1 px-4 rounded-full uppercase tracking-wider"
        style={{ backgroundColor: "rgba(255,204,0,0.2)", color: PRIMARY_ACCENT }}
      >
        {validity}
      </span>

      <div className="mt-4 pt-4 border-t w-full" style={{ borderColor: "#33333A" }}>
        <p className="text-xl font-bold">{priceFormatted}</p>
        <p className="text-xs opacity-60 mb-4" style={{ color: TEXT_MUTED }}>
          Price
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full px-4 py-2 rounded-full text-sm font-medium shadow-lg"
          style={{ backgroundColor: PRIMARY_ACCENT, color: CARD_BACKGROUND }}
        >
          Buy Now
        </button>
      </div>
    </motion.div>
  );
}


/* -----------------------------
    Main Component
------------------------------ */

export default function CustomerSummary({
  user,
  wallet,
  totalPurchases,
  products,
  loadingProducts,
  onSetActive,
  onProductClick,
}: Props) {
    // State to control the visibility of the fund wallet modal
    const [isFundModalOpen, setIsFundModalOpen] = useState(false);

    // Callback to close the modal after a successful action (or redirection)
    const handleFundSuccess = () => {
        setIsFundModalOpen(false);
        // Add logic here to show a toast/notification if needed before redirection
    };

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-slate-400 text-sm">What would you like to top up today?</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WALLET BALANCE CARD (Clickable) */}
        <div 
          className="p-4 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition group" 
          onClick={() => setIsFundModalOpen(true)} // <-- Open modal on click
        >
          {/* Title Row with Plus Icon */}
          <div className="flex items-center justify-between">
            <p className="text-sm opacity-70">Wallet Balance</p>
            <div className="flex items-center text-sm font-medium transition" style={{ color: PRIMARY_ACCENT }}>
                <span className="mr-1">Fund</span>
                <PlusIcon /> 
            </div>
          </div>
          
          <p className="text-2xl font-bold mt-1">
            {CURRENCY_SIGN} {Number(wallet.balance).toFixed(2)}
          </p>
        </div>

        {/* TOTAL PURCHASES CARD */}
        <div className="p-4 bg-white/10 rounded-xl">
          <p className="text-sm opacity-70">Total Purchases</p>
          <p className="text-2xl font-bold">{totalPurchases}</p>
        </div>
        
        {/* --- NEW: WHATSAPP GROUP CARD --- */}
        <a 
          href="https://chat.whatsapp.com/IiGozrWafyO5yof3abVyP6?mode=wwt" 
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-green-600/50 rounded-xl cursor-pointer hover:bg-green-600/70 transition group flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-white">Need Support?</p>
            <p className="text-xl font-bold mt-1 text-white">Join Our Community</p>
          </div>
          {/* WhatsApp Icon (as a simple Lucide placeholder for the brand logo) */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 448 512" 
            className="w-8 h-8 flex-shrink-0 text-white group-hover:scale-110 transition" 
            fill="currentColor"
          >
            <path d="M380.9 97.1C339.4 55.4 283.4 32 224 32C128.1 32 49.6 109.9 49.6 205.9c0 37.1 11.4 72.8 33.1 103.1L32 447.9l112.5-29.6c27.1 14.8 57.7 22.6 88.5 22.6h.1c95.9 0 174.5-77.6 174.5-173.6c0-48.4-19.6-94.2-56-130.6zM224 415.9c-28.5 0-57.1-7.8-82.5-22.6l-1.8-1l-18.7 5l5.1-18.2l-1.1-1.8c-21.7-30.3-33.1-66-33.1-103.1c0-79 63.5-143.2 142.3-143.2s142.3 64.2 142.3 143.2c0 78.9-63.5 143.2-142.3 143.2zm61.2-110.1c-3.7-1.8-22-10.9-25.4-12.1s-5.9-1.8-8.5 1.8c-2.6 3.7-9.8 12.1-12 14.6s-4.5 2.7-8.2 1.2c-3.7-1.5-15.6-5.8-29.6-18.2c-10.9-9.7-18.2-24.3-20.4-28c-2.2-3.7-.2-5.7 1.6-7.5s3.7-4.5 5.5-6.7c1.8-2.2 2.5-4.1 3.7-6.2s.6-4.1-.2-5.7c-1.8-1.5-8.2-19.6-11.2-26.9c-3-7.3-6.2-6.4-8.5-6.4s-4.5-.2-6.9-.2c-2.4-.2-6.2.8-9.5 4.5s-12.1 12-12.1 29.3c0 17.3 12.4 33.9 14.2 36.6s24.4 37.5 59.2 52.8c34.8 15.3 43.7 12.3 49 11.5s17-4.1 19.4-8c2.4-3.9 2.4-7.3 1.7-8.5c-.8-1.2-3.1-1.8-6.9-3.7z"/>
          </svg>
        </a>
        
      </div>

      {/* PRODUCTS TITLE */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Buy Data</h2>
      </div>

      {/* PRODUCTS GRID */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loadingProducts ? (
          <p className="col-span-full text-center text-slate-400">
            Loading products...
          </p>
        ) : products.length === 0 ? (
          <p className="col-span-full text-center text-slate-400">
            No products available.
          </p>
        ) : (
          products.map((product, index) => (
            <motion.div
              key={product.product_code ?? product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <ProductCard product={product} onClick={() => onProductClick(product)} />
            </motion.div>
          ))
        )}
      </div>

      {/* --- Fund Wallet Modal Integration --- */}
      <Modal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
      >
        <FundWalletForm
          // CORRECTLY PASSING REQUIRED PROPS:
          userId={user.id} 
          userEmail={user.email} 
          onSuccess={handleFundSuccess} // Pass the handler to close the modal
        />
      </Modal>
    </div>
  );
}
import React, { useCallback, useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import axios from "axios";

// --- TYPE IMPORTS ---
import type { SharedData } from "@/types";
import type { Product, User } from "@/lib/types";

// --- HOOKS ---
import { useProducts } from "@/hooks/useProducts";
import { useWallet } from "@/hooks/useWallet";

// --- COMPONENTS ---
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ProductCard from "@/components/ProductCard";
import ProductSummary from "@/components/ProductSummary";
import FundWalletForm from "@/components/FundWalletForm";
import ModalWrapper from "@/components/ModalWrapper";
import AuthModal from "@/components/AuthModal";
import Footer from "@/components/Footer";
import Loader from "@/components/ui/loader";
import PurchaseFormModal from "@/components/PurchaseFormModal";
import { Button } from "@headlessui/react";

export default function Welcome(): JSX.Element {
  const page = usePage<SharedData>();

  const [currentUser, setCurrentUser] = useState<User | undefined>(
    page.props?.auth?.user ?? undefined
  );

  const user = currentUser;

  const initialProductsFromProps =
    (page.props?.products as Product[] | undefined) ?? [];

  const walletProps = page.props as { wallet?: { balance?: number } };
  const initialWalletBalance = Number(walletProps.wallet?.balance ?? 0);

  const {
    balance: walletBalance,
    loading: loadingWallet,
    fetchWallet,
  } = useWallet(initialWalletBalance);

  const {
    products: productList,
    loading: loadingProducts,
    error: productError,
  } = useProducts(initialProductsFromProps);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalStage, setModalStage] = useState<
    "auth" | "summary" | "fund" | "purchaseForm"
  >("auth");

  const displayName = useCallback((p: Product) => `${p.name} ${p.capacity}`, []);
  const displayPrice = useCallback(
    (p: Product) => `${p.currency} ${p.price.toFixed(2)}`,
    []
  );

  const handleBuyClick = (product: Product): void => {
    setSelectedProduct(product);

    if (!currentUser) {
      setModalStage("auth");
    } else {
      setModalStage("summary");
    }

    setShowAuthModal(true);
  };

  const handleAuthSuccess = async (authenticatedUser: User): Promise<void> => {
    setCurrentUser(authenticatedUser);
    await fetchWallet();

    if (selectedProduct) {
      setModalStage("summary");
      setShowAuthModal(true);
    }
  };

  const handlePurchase = async (product: Product): Promise<void> => {
    if (!user) {
      setModalStage("auth");
      return;
    }

    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({ product_code: product.product_code }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Purchase failed: ${res.status}`);
      }

      await fetchWallet();
      setShowAuthModal(false);
    } catch (err) {
      console.error("Purchase error:", err);
      setModalStage("fund");
    }
  };

  const handleFundRequired = (): void => setModalStage("fund");

  const handleCloseModal = (): void => {
    setShowAuthModal(false);
    setTimeout(() => setModalStage("auth"), 300);
  };

  const handleLogout = async () => {
    try {
      await axios.post("/logout");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleOpenPurchaseForm = (product: Product): void => {
    setSelectedProduct(product);
    setModalStage("purchaseForm");
  };

  useEffect(() => {
    if (user) {
      void fetchWallet();
    }
  }, [user, fetchWallet]);

  return (
    <>
      <Head title="Welcome" />

      <div className="min-h-screen flex flex-col bg-[#00121A] text-slate-100 antialiased overflow-x-hidden">
        <Header
          user={user}
          walletBalance={walletBalance}
          loadingWallet={loadingWallet}
          onOpenAuth={() => {
            setModalStage("auth");
            setShowAuthModal(true);
          }}
          onLogout={handleLogout}
        />

        <Hero userExists={!!user} />

        <section id="how" className="px-5 sm:px-8 md:px-12 pt-24 pb-28">
          <div className="max-w-6xl mx-auto space-y-20">
            <HowItWorks />

            <div>
              <h2
                className="text-2xl md:text-3xl font-semibold mb-6 text-center md:text-left"
                id="popular"
              >
                Services We Offer
              </h2>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {loadingProducts ? (
                  <div className="col-span-full flex justify-center">
                    <Loader />
                  </div>
                ) : productError ? (
                  <p className="text-red-400 text-center col-span-full">
                    {productError}
                  </p>
                ) : productList.length ? (
                  productList.map((p, index) => (
                    <motion.div
                      key={p.product_code ?? p.name}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 * index }}
                    >
                      <ProductCard
                        product={p}
                        onBuy={() => {}}
                        displayName={displayName}
                        displayPrice={displayPrice}
                        isDisplayMode={true}
                      />
                    </motion.div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center col-span-full">
                    No products available.
                  </p>
                )}
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Trusted by Ghanaians</h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                Join hundreds of users buying airtime & data safely with
                SmartTopUp.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* --- MODALS --- */}
      <ModalWrapper open={showAuthModal} onClose={handleCloseModal}>
        {modalStage === "auth" && (
          <AuthModal onClose={handleCloseModal} onSuccess={handleAuthSuccess} />
        )}

        {modalStage === "summary" && selectedProduct && (
          <ProductSummary
            product={selectedProduct}
            walletBalance={walletBalance}
            onFundRequired={handleFundRequired}
            onPurchase={handlePurchase}
            onOpenPurchaseForm={handleOpenPurchaseForm}
          />
        )}

        {modalStage === "fund" && (
          <>
            {user ? (
              <FundWalletForm
                userId={user.id}
                userEmail={user.email}
                onSuccess={() => {
                  void fetchWallet();
                  setModalStage("summary");
                }}
              />
            ) : (
              <div className="text-center p-6 space-y-4">
                <p className="text-lg font-semibold text-white">
                  Action Required
                </p>
                <p className="text-red-400">
                  You must be logged in to fund your wallet.
                </p>
                <Button
                  onClick={() => setModalStage("auth")}
                  className="w-full"
                >
                  Go to Login / Register
                </Button>
              </div>
            )}

            <button
              onClick={() => setModalStage("summary")}
              className="mt-4 text-xs text-slate-400 hover:text-white block w-full text-center"
              disabled={!user}
            >
              ← Back to Summary
            </button>
          </>
        )}

        {modalStage === "purchaseForm" && selectedProduct && (
          <PurchaseFormModal
            product={selectedProduct}
            onClose={handleCloseModal}
            user={user}
          />
        )}
      </ModalWrapper>
      
      {/* --- NEW: WHATSAPP FAB (Welcome Page) --- */}
        <motion.a
          href="https://chat.whatsapp.com/IiGozrWafyO5yof3abVyP6?mode=wwt"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl p-3 flex items-center group transition-all duration-300 w-12 hover:w-56 overflow-hidden"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 1 }}
        >
          {/* WhatsApp Icon */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 448 512" 
            className="w-6 h-6 flex-shrink-0" 
            fill="currentColor"
          >
            <path d="M380.9 97.1C339.4 55.4 283.4 32 224 32C128.1 32 49.6 109.9 49.6 205.9c0 37.1 11.4 72.8 33.1 103.1L32 447.9l112.5-29.6c27.1 14.8 57.7 22.6 88.5 22.6h.1c95.9 0 174.5-77.6 174.5-173.6c0-48.4-19.6-94.2-56-130.6zM224 415.9c-28.5 0-57.1-7.8-82.5-22.6l-1.8-1l-18.7 5l5.1-18.2l-1.1-1.8c-21.7-30.3-33.1-66-33.1-103.1c0-79 63.5-143.2 142.3-143.2s142.3 64.2 142.3 143.2c0 78.9-63.5 143.2-142.3 143.2zm61.2-110.1c-3.7-1.8-22-10.9-25.4-12.1s-5.9-1.8-8.5 1.8c-2.6 3.7-9.8 12.1-12 14.6s-4.5 2.7-8.2 1.2c-3.7-1.5-15.6-5.8-29.6-18.2c-10.9-9.7-18.2-24.3-20.4-28c-2.2-3.7-.2-5.7 1.6-7.5s3.7-4.5 5.5-6.7c1.8-2.2 2.5-4.1 3.7-6.2s.6-4.1-.2-5.7c-1.8-1.5-8.2-19.6-11.2-26.9c-3-7.3-6.2-6.4-8.5-6.4s-4.5-.2-6.9-.2c-2.4-.2-6.2.8-9.5 4.5s-12.1 12-12.1 29.3c0 17.3 12.4 33.9 14.2 36.6s24.4 37.5 59.2 52.8c34.8 15.3 43.7 12.3 49 11.5s17-4.1 19.4-8c2.4-3.9 2.4-7.3 1.7-8.5c-.8-1.2-3.1-1.8-6.9-3.7z"/>
          </svg>
          
          {/* Text that expands on hover */}
          <span className="text-sm font-semibold whitespace-nowrap ml-3 transition-opacity duration-150 opacity-0 group-hover:opacity-100 absolute left-[45px]">
            Join Our WhatsApp Community
          </span>
        </motion.a>
      
    </>
  );
}

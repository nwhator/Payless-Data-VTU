import React, { useState, useMemo, useEffect } from "react";
import { usePage, Head } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

// --- Interfaces ---
interface Product {
  id: number;
  name?: string;
  product_code: string;
  network?: string;
  category: string;
  capacity: string;
  validity: string;
  price: number | null;
}

interface Store {
  id: number;
  store_name: string;
  store_slug: string;
  description?: string;
  banner_image?: string | null;
  logo?: string | null;
  whatsapp_number?: string | null;
}
// ------------------------------------

// --- Network grouping helpers ---
const NETWORK_DISPLAY: Record<string, string> = {
  MTN: "MTN",
  Telcel: "Telecel",
  Airtel: "AirtelTigo",
  Glo: "Glo",
  Vodafone: "Vodafone",
};

function getNetworkName(product: Product): string {
  const raw = (product.network || "").trim();
  if (raw && NETWORK_DISPLAY[raw]) return NETWORK_DISPLAY[raw];
  if (raw) return raw;
  return "";
}
// -------------------------------

// --- Phone Number Validation Function ---
const isValidGhanaianPhoneNumber = (number: string): boolean => {
  const cleanedNumber = number.replace(/[^0-9]/g, "");
  const ghanaRegex = /^(?:233|0)(2|5)\d{8}$/;
  return ghanaRegex.test(cleanedNumber);
};
// ------------------------------------------

// Helper component for detail rows
const DetailRow: React.FC<{ label: string; value: string; color: string; isPrice?: boolean }> = ({ label, value, color, isPrice }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-400 font-medium">{label}:</span>
    <span className={`font-semibold ${isPrice ? "text-lg" : ""}`} style={{ color }}>
      {value}
    </span>
  </div>
);

// --- NEW: CSRF Token Retrieval Function (Cookie Method) ---
const getCookieToken = (): string | null => {
  try {
    const tokenMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return tokenMatch && tokenMatch[1] ? decodeURIComponent(tokenMatch[1]) : null;
  } catch (e) {
    console.error("Error reading CSRF token from cookie:", e);
    return null;
  }
};
// ------------------------------------------


// --- Purchase Modal Component ---
interface PurchaseModalProps {
  product: Product;
  store: Store;
  onClose: () => void;
  PRIMARY_ACCENT: string;
  CARD_BACKGROUND: string;
  TEXT_LIGHT: string;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  product,
  store,
  onClose,
  PRIMARY_ACCENT,
  CARD_BACKGROUND,
  TEXT_LIGHT,
}) => {
  const [formData, setFormData] = useState({
    product_id: product.id,
    store_id: store.id,
    recipient_number: "",
    email: "",
    amount: product.price,
  });

  const [processing, setProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [numberError, setNumberError] = useState("");
  const [generalError, setGeneralError] = useState<string>("");

  // --- NEW: Ensure CSRF Cookie Exists on Mount ---
  useEffect(() => {
    const fetchCsrfCookie = async () => {
      try {
        await fetch("/sanctum/csrf-cookie", {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
      } catch (e) {
        console.error("Failed to refresh CSRF cookie:", e);
      }
    };
    void fetchCsrfCookie();
  }, []);
  // ------------------------------------------------

  const setData = (key: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
        setFieldErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[key];
            return newErrors;
        });
    }
    setGeneralError("");
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setData("recipient_number", value);

    if (value && !isValidGhanaianPhoneNumber(value)) {
      setNumberError("Must be a valid Ghanaian mobile number (e.g., 054xxxxxxx).");
    } else {
      setNumberError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setFieldErrors({});
    setGeneralError("");
    
    if (!isValidGhanaianPhoneNumber(formData.recipient_number)) {
      setNumberError("Please enter a valid Ghanaian mobile number.");
      setProcessing(false);
      return;
    }

    if (formData.amount === null) {
      alert("This product is currently unavailable for purchase.");
      setProcessing(false);
      return;
    }

    // --- NEW: Get Token from Cookie ---
    const csrfToken = getCookieToken();
    
    if (!csrfToken) {
        setGeneralError("Session expired or invalid. Please refresh the page.");
        setProcessing(false);
        return;
    }

    try {
      const response = await fetch('/paystack/initialize', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify(formData), 
      });

      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        // 1. Alert the user (Script pauses here until OK is clicked)
        alert('Payment initialization successful! Click OK to open payment page.');
        
        // 2. Try to open in a new tab
        const newWindow = window.open(responseData.authorization_url, '_blank');

        // 3. Fallback: If browser blocked the popup, redirect in current tab
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            alert("Popup was blocked by your browser. Redirecting in this tab instead.");
            window.location.href = responseData.authorization_url;
        }
        
        // Optional: Close modal since user is leaving
        onClose(); 

      } else if (response.status === 422) {
        const validationErrors: Record<string, string[]> = responseData.errors;
        
        const errorsMap: Record<string, string> = {};
        for (const key in validationErrors) {
          if (validationErrors[key].length > 0) {
            errorsMap[key] = validationErrors[key][0];
          }
        }
        setFieldErrors(errorsMap);
        setGeneralError("Please correct the errors in the form.");

      } else {
        const message = responseData.message || 'An unexpected error occurred during payment initialization.';
        setGeneralError(message);
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setGeneralError("Network error or server connection failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const isFormValid = useMemo(() => {
    return isValidGhanaianPhoneNumber(formData.recipient_number) && formData.email && !processing;
  }, [formData.recipient_number, formData.email, processing]);

  if (product.price === null) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: CARD_BACKGROUND }}
        initial={{ y: -50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-3xl font-extrabold mb-4 border-b pb-3"
          style={{ color: PRIMARY_ACCENT, borderColor: `${TEXT_LIGHT}20` }}
        >
          Purchase Bundle
        </h3>

        {/* Product Details */}
        <div className="space-y-3 mb-6">
          <DetailRow label="Network" value="MTN" color={PRIMARY_ACCENT} />
          <DetailRow label="Capacity" value={product.capacity} color={TEXT_LIGHT} />
          <DetailRow
            label="Price"
            value={`₵ ${formData.amount ? formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Unavailable"}`}
            color={PRIMARY_ACCENT}
            isPrice
          />
        </div>
        
        {generalError && (
            <p className="text-red-400 text-sm font-semibold mb-3 bg-red-900/30 p-2 rounded">
                ⚠️ {generalError}
            </p>
          )}

        {/* Purchase Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_LIGHT }}>
              Recipient Number (Ghanaian)
            </label>
            <input
              type="tel"
              value={formData.recipient_number}
              onChange={handleNumberChange}
              placeholder="e.g. 054xxxxxxx"
              className={`w-full p-3 rounded-lg bg-gray-700/50 text-white border transition-colors focus:ring-2 focus:ring-[${PRIMARY_ACCENT}] focus:border-[${PRIMARY_ACCENT}]`}
              style={{ borderColor: numberError || fieldErrors.recipient_number ? "red" : `${TEXT_LIGHT}20` }}
              required
              disabled={processing}
            />
            {(numberError || fieldErrors.recipient_number) && (
              <p className="text-red-400 text-xs mt-1">{numberError || fieldErrors.recipient_number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: TEXT_LIGHT }}>
              Email (For receipt)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setData("email", e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-700 transition-colors focus:ring-2 focus:ring-yellow-600 focus:border-yellow-600"
              style={{ borderColor: fieldErrors.email ? "red" : `${TEXT_LIGHT}20` }}
              required
              disabled={processing}
            />
              {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={!isFormValid || processing}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 mt-6 ${isFormValid && !processing ? "shadow-lg" : "opacity-50 cursor-not-allowed"}`}
            style={{ backgroundColor: PRIMARY_ACCENT, color: CARD_BACKGROUND }}
            whileHover={isFormValid && !processing ? { scale: 1.02, boxShadow: "0 5px 15px rgba(255, 204, 0, 0.4)" } : {}}
            whileTap={isFormValid && !processing ? { scale: 0.98 } : {}}
          >
            {processing ? 'Processing Payment...' : 'Proceed to Payment'}
          </motion.button>
        </form>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          disabled={processing}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
};


// --- Main PublicStore Component ---
const PublicStore: React.FC = () => {
    
    const { store, products } = usePage<{
      store: Store;
      products: Product[];
    }>().props;
  
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [openNetwork, setOpenNetwork] = useState<string | null>(null);
  
    const PRIMARY_ACCENT = "#FFCC00";
    const BACKGROUND_DARK = "#14141A";
    const CARD_BACKGROUND = "#1E1E24";
    const TEXT_LIGHT = "#E0E0E0";
    const TEXT_ACCENT = PRIMARY_ACCENT;

    const groupedProducts = useMemo(() => {
      const groups: Record<string, Product[]> = {}
      for (const p of products) {
        const net = getNetworkName(p);
        if (!net) continue;
        if (!groups[net]) groups[net] = []
        groups[net].push(p)
      }
      Object.keys(groups).forEach((key) => {
        groups[key].sort((a: any, b: any) => {
          const va = a.capacity_value ?? 0;
          const vb = b.capacity_value ?? 0;
          return va - vb;
        });
      });
      return groups
    }, [products])

    // Logic to find the cheapest available product for the dynamic meta description
    const cheapestProduct = useMemo(() => {
        const availableProducts = products.filter(p => p.price !== null);
        if (availableProducts.length === 0) return null;

        // Find the product with the minimum price
        return availableProducts.reduce((min, p) => (p.price! < min.price! ? p : min), availableProducts[0]);
    }, [products]);

    // Generate Dynamic Meta Content
    const baseTitle = `${store.store_name} | Buy Cheap MTN Data Bundles`;
    let metaDescription = store.description || `Visit ${store.store_name} for reliable and instant MTN data bundles.`;
    
    if (cheapestProduct && cheapestProduct.price !== null) {
        const formattedPrice = cheapestProduct.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Detailed description featuring the cheapest price
        metaDescription = `🔥 LIMITED OFFER: Get MTN ${cheapestProduct.capacity} Data for only ₵${formattedPrice} from ${store.store_name}. Quick top-up now!`;
    }
    
    // Determine the image for the social preview (use logo, then banner)
    const ogImage = store.logo || store.banner_image;


    // Framer Motion variant for product card lift effect
    const hoverEffect = {
      initial: {
        scale: 1,
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
      },
      hover: {
        scale: 1.05,
        boxShadow: "0 10px 30px rgba(255, 204, 0, 0.5)",
        transition: {
          duration: 0.3,
        },
      },
      tap: {
        scale: 0.98,
      },
    };
  
    const handleProductClick = (product: Product) => {
      if (product.price !== null) {
          setSelectedProduct(product);
      }
    };
  
    return (
      <>
        {/* ---------------------------------------------------- */}
        {/* META TAGS: Crucial for rich WhatsApp/Social Previews */}
        {/* ---------------------------------------------------- */}
        <Head title={baseTitle}>
            {/* Standard Meta Tags */}
            <meta name="description" content={metaDescription} />
            <meta name="theme-color" content={PRIMARY_ACCENT} />

            {/* Open Graph Tags (for WhatsApp, Facebook, Telegram) */}
            <meta property="og:title" content={baseTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={window.location.href} /> 
            {ogImage && <meta property="og:image" content={ogImage} />}
            <meta property="og:site_name" content={store.store_name} />
            
            {/* Twitter Card Tags (for Twitter/X) */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={baseTitle} />
            <meta name="twitter:description" content={metaDescription} />
            {ogImage && <meta name="twitter:image" content={ogImage} />}
        </Head>

        <div
          className="min-h-screen text-white"
          style={{ backgroundColor: BACKGROUND_DARK }}
        >
          {/* Header and Banner Section */}
          <header className="relative w-full">
              <div className="w-full h-48 sm:h-64 md:h-80 bg-[#102630] flex items-center justify-center overflow-hidden">
                  {store.banner_image ? (
                      <>
                      <img
                          src={store.banner_image}
                          alt="Store Banner"
                          className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      </>
                  ) : (
                      <div className="text-slate-400 text-base">No banner uploaded</div>
                  )}
              </div>
  
              <div className="px-4 sm:px-6 md:px-10 pt-16 -mt-20 text-center relative z-10">
                  <div className="flex justify-center mb-6">
                      {store.logo ? (
                      <img
                          src={store.logo}
                          alt="Store Logo"
                          className="h-28 w-28 rounded-full border-4 object-cover"
                          style={{ borderColor: BACKGROUND_DARK, boxShadow: "0 0 0 4px #FFCC00" }}
                      />
                      ) : (
                      <div
                          className="h-28 w-28 rounded-full flex items-center justify-center text-3xl font-extrabold"
                          style={{ backgroundColor: PRIMARY_ACCENT, color: BACKGROUND_DARK, boxShadow: "0 0 0 4px #FFCC00" }}
                      >
                          {store.store_name.charAt(0)}
                      </div>
                      )}
                  </div>
  
                  <h1 className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: TEXT_LIGHT }}>
                      {store.store_name}
                  </h1>
                  {store.description && (
                      <p className="text-base text-gray-400 max-w-2xl mx-auto">
                      {store.description}
                      </p>
                  )}
  
                  {store.whatsapp_number && (
                      <a
                      href={`https://wa.me/${store.whatsapp_number.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#1EBE57] transition-all duration-300 shadow-lg hover:shadow-2xl"
                      >
                      <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 32 32"
                          className="h-5 w-5 fill-white"
                      >
                          <path d="M16.002 3C9.379 3 4 8.379 4 15c0 2.58.828 4.98 2.293 7.004L4 29l7.223-2.273A11.897 11.897 0 0 0 16.002 27c6.621 0 12-5.379 12-12S22.623 3 16.002 3zm0 21a8.937 8.937 0 0 1-4.543-1.229l-.324-.188-4.293 1.355 1.398-4.16-.21-.34A8.896 8.896 0 0 1 7 15c0-4.965 4.037-9 9.002-9C20.967 6 25 10.035 25 15s-4.033 9-8.998 9zm4.84-6.633c-.27-.137-1.598-.785-1.844-.871-.25-.09-.434-.137-.617.137-.184.27-.707.871-.867 1.051-.156.18-.32.203-.59.066-.266-.137-1.125-.414-2.141-1.32-.793-.707-1.332-1.582-1.488-1.848-.156-.266-.016-.41.121-.547.125-.125.266-.32.398-.48.133-.16.18-.266.27-.445.09-.18.047-.34-.02-.48-.066-.137-.617-1.492-.848-2.051-.223-.539-.449-.465-.617-.465h-.527c-.18 0-.48.07-.734.34-.25.27-.965.945-.965 2.305 0 1.363.988 2.68 1.125 2.863.133.18 1.953 2.988 4.742 4.184.66.285 1.176.453 1.578.578.664.211 1.266.18 1.742.109.531-.078 1.598-.652 1.824-1.285.23-.633.23-1.18.16-1.285-.066-.11-.25-.18-.52-.32z" />
                      </svg>
                      Chat on WhatsApp
                      </a>
                  )}
              </div>
          </header>
  
          {/* Products Section */}
          <div className="mt-16 pt-10 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
              {products.length > 0 && (
                <h2
                  className="text-3xl font-extrabold mb-8 text-center sm:text-left"
                  style={{ color: TEXT_ACCENT }}
                >
                    Available Data Bundles
                </h2>
              )}
  
              {products.length ? (
                <div className="space-y-4">
                  {Object.entries(groupedProducts).map(([network, netProducts]) => (
                    <div key={network} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setOpenNetwork(openNetwork === network ? null : network)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold"
                            style={{ backgroundColor: `${PRIMARY_ACCENT}22`, color: PRIMARY_ACCENT }}
                          >
                            {network.charAt(0)}
                          </div>
                          <div>
                            <span className="text-base sm:text-lg font-semibold text-white">{network}</span>
                            <span className="ml-2 text-xs text-gray-400">({netProducts.length})</span>
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
                                  onClick={() => handleProductClick(p)}
                                  variants={hoverEffect}
                                  whileHover="hover"
                                  whileTap="tap"
                                  className={`flex flex-col items-center p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-center ${p.price === null ? "opacity-50 grayscale cursor-not-allowed" : "hover:border-yellow-600"}`}
                                  style={{ backgroundColor: CARD_BACKGROUND, color: TEXT_LIGHT, borderColor: p.price === null ? "#33333A" : "transparent" }}
                                >
                                  <div className="text-4xl font-black mb-1" style={{ color: PRIMARY_ACCENT }}>
                                    {p.capacity}
                                  </div>
                                  <p className="text-sm font-medium opacity-70 mb-3">
                                    {network} Data Bundle
                                  </p>
                                  <span
                                    className="text-xs font-bold py-1 px-4 rounded-full uppercase tracking-wider"
                                    style={{ backgroundColor: "rgba(255, 204, 0, 0.2)", color: PRIMARY_ACCENT }}
                                  >
                                    {p.validity}
                                  </span>
                                  <div className="mt-4 pt-4 border-t w-full" style={{ borderColor: "#33333A" }}>
                                    <p className="text-lg font-bold" style={{ color: TEXT_LIGHT }}>
                                      {p.price !== null ? (
                                        <span>
                                          <span className="text-sm font-light opacity-80">₵</span>
                                          {p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      ) : "Unavailable"}
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
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic text-center">
                  No products available yet. Check back soon!
                </p>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <footer
            className="py-8 text-center text-slate-500 text-sm border-t"
            style={{ borderColor: "#2A2A33", backgroundColor: BACKGROUND_DARK }}
          >
            &copy; {new Date().getFullYear()} {store.store_name} from Payless Data. All rights reserved.
          </footer>
        </div>
  
        {/* --- Purchase Modal Integration --- */}
        <AnimatePresence>
          {selectedProduct && (
            <PurchaseModal
              product={selectedProduct}
              store={store}
              onClose={() => setSelectedProduct(null)}
              PRIMARY_ACCENT={PRIMARY_ACCENT}
              CARD_BACKGROUND={CARD_BACKGROUND}
              TEXT_LIGHT={TEXT_LIGHT}
            />
          )}
        </AnimatePresence>
      </>
    );
  };
  
  export default PublicStore;
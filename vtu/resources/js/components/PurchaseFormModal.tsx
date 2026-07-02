import React, { useState } from "react";
import type { Product, User } from "@/lib/types";
import { X, Package, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
// Import axios for reliable request handling
import axios from 'axios'; 

interface Props {
    product: Product;
    user: User | undefined;
    onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GHANA_PHONE_REGEX = /^0(20|24|26|27|50|54|55|56|57|59)\d{7}$/;

export default function PurchaseFormModal({ product, user, onClose }: Props) {
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const safePrice = Number(product.customer_price ?? 0);
    const isFormValid =
        EMAIL_REGEX.test(email) && GHANA_PHONE_REGEX.test(phone) && !!user?.id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            setError("Please fill all fields correctly and ensure you are logged in.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // ⭐ REMOVED the redundant /sanctum/csrf-cookie fetch.
            // Axios handles the token retrieval from the cookie automatically 
            // after the initial Inertia page load.
            
            // Use axios for a more robust request that correctly sends the CSRF token
            const res = await axios.post("/paystack/main-initialize", {
                email,
                amount: safePrice,
                product_id: product.id,
                recipient_number: phone,
                user_id: user!.id,
            });

            const data = res.data; // Axios wraps the response data

            if (!data.authorization_url) {
                // If the backend returned a non-2xx status, axios would have already thrown an error.
                // This checks for successful data structure but missing redirect URL.
                throw new Error(data.message || "Payment initialization failed: Missing authorization URL.");
            }

            // Redirect the user to Paystack to complete the payment
            window.location.href = data.authorization_url;

        } catch (err: any) {
            // Axios error handling: Check for the 419 status explicitly
            if (err?.response?.status === 419) {
                 setError("CSRF token mismatch. Please try refreshing the page and logging in again.");
                 console.error("CSRF token mismatch (419):", err);
            } else {
                 console.error("Payment error:", err);
                 // Use a more specific error message if available
                 setError(err?.response?.data?.message || err?.message || "Unexpected error during payment");
            }
        } finally {
            setLoading(false);
        }
    };

    // If user is not logged in
    if (!user?.id) {
        return (
            <div className="p-6 bg-red-800/20 text-white rounded-lg w-full max-w-md mx-auto text-center">
                <p className="text-xl font-bold mb-2">Login Required</p>
                <p>You must be logged in to purchase this product.</p>
                <Button onClick={onClose} className="mt-4">
                    Close
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#00121A] text-white rounded-lg w-full max-w-md mx-auto relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Pay with Card / Details</h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex items-center bg-white/5 p-4 rounded-lg mb-6">
                <Package className="text-[#4DFF8F] mr-3" size={24} />
                <div>
                    <p className="font-semibold text-sm text-slate-300">Product</p>
                    <p className="font-semibold">
                        {product.name} {product.capacity ?? ""}
                    </p>
                    <p className="text-2xl font-extrabold text-[#00C4FF]">
                        {product.currency ?? "₵"} {safePrice.toFixed(2)}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Recipient Email</label>
                    <Input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-white/10 border-white/20 text-white"
                    />
                    {email && !EMAIL_REGEX.test(email) && (
                        <p className="text-xs text-red-400 mt-1">Enter a valid email.</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Recipient Number</label>
                    <Input
                        type="tel"
                        placeholder="e.g. 024XXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="bg-white/10 border-white/20 text-white"
                    />
                    {phone && !GHANA_PHONE_REGEX.test(phone) && (
                        <p className="text-xs text-red-400 mt-1">
                            Must be a valid Ghana mobile number.
                        </p>
                    )}
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <Button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className="w-full justify-center bg-[#00C4FF] hover:bg-[#00C4FF]/90 text-black font-bold"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Proceed to Payment"}
                </Button>

                <p className="text-center text-xs text-slate-500 mt-1">Powered by Paystack</p>
            </form>
        </div>
    );
}
// resources/js/hooks/useProducts.ts (or similar file)

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types"; // Assuming Product includes capacity and validity
import { safeNumber, pickString } from "@/lib/helpers";

const BACKEND_PRODUCTS_ENDPOINT = "/api/v1/products";

// describe the possible raw shapes we expect from backend
type RawProduct = {
    price?: number | string;
    price_value?: number | string;
    amount?: number | string;
    cost?: number | string;
    customer_price?: number | string; 
    currency?: string;
    currency_code?: string;
    currency_symbol?: string;
    name?: string;
    display_name?: string;
    title?: string;
    product_code?: string;
    productCode?: string;
    id?: string | number;
    capacity?: string | number;
    validity?: string | number; // Added to raw type
    capacity_value?: string | number;
    duration?: string | number; // Added to raw type
};

export function useProducts(initial: Product[] = []) {
    const [products, setProducts] = useState<Product[]>(initial);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchProducts = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(BACKEND_PRODUCTS_ENDPOINT, {
                    headers: { Accept: "application/json" },
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`Backend error: ${res.status} ${txt}`);
                }

                const json: unknown = await res.json();
                let rawArr: RawProduct[] = [];

                if (Array.isArray(json)) {
                    rawArr = json as RawProduct[];
                } else if (json && typeof json === "object") {
                    const j = json as Record<string, unknown>;
                    const data = j.data as unknown;

                    if (Array.isArray(data)) rawArr = data as RawProduct[];
                    else if (
                        data &&
                        typeof data === "object" &&
                        Array.isArray((data as Record<string, unknown>).products)
                    )
                        rawArr = (data as Record<string, unknown>).products as RawProduct[];
                    else if (Array.isArray(j.products))
                        rawArr = j.products as RawProduct[];
                    else if (
                        data &&
                        typeof data === "object" &&
                        Array.isArray((data as Record<string, unknown>).items)
                    )
                        rawArr = (data as Record<string, unknown>).items as RawProduct[];
                }

                const mapped: Product[] = rawArr.map((p) => {
                    // Price mapping remains the same
                    const customerPrice = safeNumber(
                        p.customer_price ?? p.price ?? p.price_value ?? p.amount ?? p.cost
                    );
                    const finalPrice = Number(customerPrice.toFixed(2));

                    // Currency mapping remains the same
                    const curFromSupplier = pickString(
                        p.currency ?? p.currency_code ?? p.currency_symbol ?? ""
                    );
                    const currencySym =
                        curFromSupplier.trim().toUpperCase() === "GHS" ||
                        curFromSupplier === "₵"
                            ? "₵"
                            : curFromSupplier || "₵";

                    // Name mapping remains the same
                    const name = pickString(
                        p.name ??
                            p.display_name ??
                            p.title ??
                            p.product_code ??
                            p.productCode ??
                            ""
                    );
                    
                    // CAPACITY: Use the most descriptive field for the large display text
                    const capacity = pickString(
                        p.capacity ??
                        p.capacity_value ??
                        ""
                    );
                    
                    // VALIDITY: Use the field that indicates duration/validity
                    const validity = pickString(
                        p.validity ??
                        p.duration ??
                        (capacity.toLowerCase().includes('day') ? capacity : '') // Fallback if capacity contains duration
                    );

                    // Extract the actual database ID, defaulting to 0 if missing
                   const id = safeNumber(p.id ?? 0); // <--- NEW: Extract the ID

                    const product_code = pickString(
                        p.product_code ?? p.productCode ?? p.id ?? ""
                    );

                    return { 
                        id,
                        name, 
                        capacity: capacity || name.split(" ")[0] || "", // Ensure capacity is set, falling back to first word of name
                        validity: validity || "No Expiry", // **NEW**: Map validity here
                        price: finalPrice,
                        customer_price: finalPrice, 
                        currency: currencySym, 
                        product_code 
                    };
                });

                if (!cancelled) {
                    setProducts(mapped.length ? mapped : initial);
                }
            } catch (err) {
                console.error("Failed to fetch products:", err);
                if (!cancelled) {
                    const message =
                        err instanceof Error ? err.message : "Failed to load products";
                    setError(message);
                    setProducts(initial);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchProducts();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { products, loading, error, setProducts };
}
import React from "react";
import { Package } from "lucide-react";
import { Button } from "./ui/button";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  walletBalance: number;
  onFundRequired: () => void;
  onOpenPurchaseForm: (product: Product) => void;
}

export default function ProductSummary({
  product,
  walletBalance,
  onFundRequired,
  onOpenPurchaseForm,
}: Props) {
  const isEnoughFunds = walletBalance >= product.price;

  return (
    <div className="text-center space-y-4">
      {/* <Package className="mx-auto mb-3 text-[#4DFF8F]" size={24} /> */}

      <h3 className="text-xl text-white font-semibold">
        {product.name} {product.capacity}
      </h3>

      <p className="text-3xl font-extrabold text-[#00C4FF]">
        {product.currency} {product.price.toFixed(2)}
      </p>

      <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-left space-y-2">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Product Cost:</span>
          <span className="text-white font-medium">
            {product.currency} {product.price.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Your Current Balance:</span>
          <span
            className={`font-semibold ${
              isEnoughFunds ? "text-[#4DFF8F]" : "text-red-400"
            }`}
          >
            {product.currency} {walletBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {!isEnoughFunds && (
        <p className="text-sm py-1">
          <span className="text-red-400 font-medium">Low balance.</span>
          <button
            onClick={onFundRequired}
            className="text-yellow-400 hover:underline font-medium ml-1"
          >
            Fund wallet
          </button>
          <span className="text-slate-400">
            {" "}
            to complete future purchases instantly, or proceed below.
          </span>
        </p>
      )}

      <div className="space-y-3 pt-2">
        <Button
          onClick={() => onOpenPurchaseForm(product)}
          className="w-full justify-center bg-[#00C4FF] hover:bg-[#00C4FF]/90 text-black font-bold"
        >
          Buy Now
        </Button>
      </div>
    </div>
  );
}

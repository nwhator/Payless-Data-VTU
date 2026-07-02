// resources/js/Components/Hero.tsx
import React from "react";
import { motion } from "framer-motion";

interface Props {
  userExists: boolean;
}

export default function Hero({ userExists }: Props) {
  const brandGradient = "bg-gradient-to-r from-[#00C4FF] to-[#4DFF8F]";
  const brandText = "text-transparent bg-clip-text " + brandGradient;

  return (
    <main className="flex-1 px-5 sm:px-8 md:px-12 pt-16 pb-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="text-center lg:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            Powering <span className={brandText}>instant</span> airtime & data — everywhere in Ghana.
          </h1>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto lg:mx-0">SmartTopUp makes buying airtime and data effortless. Fund your wallet via Paystack, top up phones instantly, or register as an agent to resell and earn commissions.</p>

          <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-3">
            <button onClick={() => void (window.location.href = userExists ? "/dashboard/customer" : "#popular")} className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold shadow-lg" style={{ background: "linear-gradient(90deg,#00C4FF,#4DFF8F)", color: "#00121A" }}>
              Buy Now
            </button>

            <a href="#how" className="inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm border border-white/10 hover:bg-white/5">Become an Agent</a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="relative mt-10 lg:mt-0">
          <div className="w-full max-w-sm sm:max-w-md mx-auto relative">
            <div aria-hidden className="absolute -inset-12 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle at 10% 20%, rgba(0,196,255,0.10), transparent), radial-gradient(circle at 90% 80%, rgba(77,255,143,0.07), transparent)" }} />
            <img src="/assets/images/vtu-hero.svg" alt="SmartTopUp illustration" className="relative z-10 w-full drop-shadow-[0_20px_60px_rgba(56,189,248,0.14)]" loading="eager" />
          </div>
        </motion.div>
      </div>
    </main>
  );
}

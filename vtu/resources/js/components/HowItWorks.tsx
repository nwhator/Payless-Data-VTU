// resources/js/Components/HowItWorks.tsx
import React from "react";
import { CreditCard, Smartphone, Package, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  { icon: <CreditCard size={20} />, title: "Fund your wallet", desc: "Top up via Paystack instantly." },
  { icon: <Smartphone size={20} />, title: "Buy airtime/data", desc: "Select a network and amount." },
  { icon: <Package size={20} />, title: "Earn as an agent", desc: "Resell and get commissions." },
  { icon: <ShieldCheck size={20} />, title: "Secure & instant", desc: "Backed by Paystack and SSL." },
];

export default function HowItWorks() {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center md:text-left">How Payless Data works</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, i) => (
          <motion.div key={i} whileHover={{ y: -4 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <div className="flex justify-center mb-3 text-[#00C4FF]">{step.icon}</div>
            <h3 className="font-semibold mb-2">{step.title}</h3>
            <p className="text-slate-400 text-sm">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// resources/js/Components/Footer.tsx
import React from "react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/8 px-5 sm:px-8 md:px-12 py-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-400">© {new Date().getFullYear()} SmartTopUp — Instant Airtime & Data</div>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <a href="#" className="hover:text-white">Terms</a>
          <a href="#" className="hover:text-white">Privacy</a>
          <a href="#" className="hover:text-white">Support</a>
        </div>
      </div>
    </footer>
  );
}

import React, { useState } from "react";
import { Menu, X, Wallet as WalletIcon } from "lucide-react";
import type { User } from "@/lib/types";
import { Link } from "@inertiajs/react";

interface Props {
  user?: User;
  walletBalance: number;
  loadingWallet: boolean;
  onOpenAuth: () => void;
  onLogout: () => Promise<void> | void;
}

export default function Header({
  user,
  walletBalance,
  loadingWallet,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const brandGradient = "bg-gradient-to-r from-[#00C4FF] to-[#4DFF8F]";
  const brandText = "text-transparent bg-clip-text " + brandGradient;
  const CURRENCY_SIGN = "₵"; // Cedi

  const getDashboardRoute = (role: string | undefined): string => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "agent":
        return "/agent/dashboard";
      case "customer":
      default:
        return "/dashboard/customer";
    }
  };

  const dashboardPath = getDashboardRoute(user?.role);

  return (
    <header className="w-full px-5 sm:px-8 md:px-12 py-4 flex items-center justify-between z-20 relative text-white">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(0,196,255,0.14), rgba(77,255,143,0.06))",
          }}
        >
          <img
            src="/assets/images/logo.png"
            alt="Logo"
            className="w-9 h-9 object-cover"
          />
        </Link>

        <div>
          <div className={`font-semibold text-lg ${brandText}`}>
            SmartTopUp
          </div>
          <div className="text-xs text-slate-400 -mt-0.5">
            Instant Airtime & Data
          </div>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-slate-300 text-sm">
              Hello, {user.name.split(" ")[0]}
            </span>

            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <WalletIcon size={14} className="opacity-80" />
              {loadingWallet
                ? "..."
                : `${CURRENCY_SIGN}${walletBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>

            <button
              onClick={() => void (window.location.href = dashboardPath)}
              className="px-4 py-2 rounded-md border border-white/10 text-sm hover:bg-white/5"
            >
              Dashboard
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-1 rounded-md text-sm hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="px-4 py-2 text-sm hover:text-white/90"
            >
              Log in
            </Link>

            <Link
              href="/register"
              className="px-4 py-2 rounded-full text-sm font-medium shadow-[0_6px_24px_rgba(0,196,255,0.08)]"
              style={{
                background: "linear-gradient(90deg,#00C4FF,#4DFF8F)",
                color: "#00121A",
              }}
            >
              Register
            </Link>

          </>
        )}
      </nav>

      <button
        className="md:hidden p-2 rounded-md hover:bg-white/5"
        onClick={() => setMenuOpen((s) => !s)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {menuOpen && (
        <div className="absolute top-16 left-0 w-full bg-[#00121A]/95 backdrop-blur-md border-t border-white/10 flex flex-col items-center gap-4 py-6 md:hidden">
          {user ? (
            <>
              <div className="text-slate-300 text-sm">
                Hello, {user.name.split(" ")[0]}
              </div>

              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <WalletIcon size={14} className="opacity-80" />
                {loadingWallet
                  ? "..."
                  : `${CURRENCY_SIGN}${walletBalance.toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`}
              </span>

              <button
                onClick={() => void (window.location.href = dashboardPath)}
                className="px-4 py-2 rounded-md border border-white/10 text-sm hover:bg-white/5"
              >
                Dashboard
              </button>

              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-md text-sm hover:bg-white/5"
              >
                Logout
              </button>
            </>
          ) : (
            <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm hover:text-white/90"
                >
                  Log in
                </Link>

                <Link
                  href="/register"
                  className="px-4 py-2 rounded-full text-sm font-medium shadow-md"
                  style={{
                    background: "linear-gradient(90deg,#00C4FF,#4DFF8F)",
                    color: "#00121A",
                  }}
                >
                  Register
                </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

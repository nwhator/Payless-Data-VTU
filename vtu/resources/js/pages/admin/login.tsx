// resources/js/Pages/Admin/Login.tsx
import React, { useState } from "react";
import { router, usePage, Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/loader";

// Define safe and strict page props
interface PageProps extends Record<string, unknown> {
  old?: { email?: string };
  errors?: Record<string, string | string[]>;
}

export default function AdminLogin() {
  const { props } = usePage<PageProps>();

  const [email, setEmail] = useState<string>(
    String(props.old?.email ?? "")
  );
  const [password, setPassword] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const errors = props.errors ?? {};

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    router.post(
      "/admin/login",
      { email, password },
      {
        onError: () => setProcessing(false),
        onFinish: () => setProcessing(false),
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#00121A] text-slate-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-[#001A23] border border-white/8 rounded-2xl p-8 shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            
              <Link href="/" className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 border border-blue-100 overflow-hidden">
                            <img
                              src="/assets/images/logo.png"
                              alt="Logo"
                              className="w-11 h-11 object-contain"
                            />
              </Link>
            
            <div>
              <div
                className="text-lg font-semibold bg-clip-text text-white p-2"
                style={{
                  background: "linear-gradient(90deg,#00C4FF,#4DFF8F)",
                }}
              >
                Smart Top-Up Admin Portal
              </div>
              {/* <div className="text-xs text-slate-400 -mt-0.5">
                Admin Portal
              </div> */}
            </div>
          </div>

          {/* Login form */}
          <h2 className="text-2xl font-bold mb-1">Admin Login</h2>
          <p className="text-sm text-slate-400 mb-5">
            Sign in to manage prices, margins & system settings.
          </p>

          {errors.general && (
            <div className="mb-4 text-sm text-red-400">
              {Array.isArray(errors.general)
                ? errors.general.join(", ")
                : errors.general}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm"
                placeholder="admin@yourdomain.com"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">
                  {Array.isArray(errors.email)
                    ? errors.email.join(", ")
                    : errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">
                  {Array.isArray(errors.password)
                    ? errors.password.join(", ")
                    : errors.password}
                </p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                className="w-full justify-center"
                disabled={processing}
              >
                {processing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader /> Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>
              Use your admin credentials to access pricing controls.
            </span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} SmartTopUp
        </div>
      </div>
    </div>
  );
}

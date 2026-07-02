import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { router } from "@inertiajs/react";
import type { User } from "@/lib/types";

type InertiaFormErrors = Record<string, string>;

interface InertiaAuthPage {
  props?: {
    auth?: {
      user?: {
        id?: number | string;
        name?: string | null;
        email?: string | null;
        role?: string | null;
      };
    };
  };
}

interface LoginFormProps {
  onSuccess?: (user: User) => void;
}

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

const Button = ({ children, className, disabled, type, onClick }: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    className={`px-4 py-2 font-semibold rounded-lg transition duration-150 w-full flex justify-center items-center ${
      className || "bg-indigo-600 hover:bg-indigo-700 text-white"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    disabled={disabled}
  >
    {children}
  </button>
);

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<InertiaFormErrors>({});
  const [loading, setLoading] = useState(false);

  const submitLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoginErrors({});
    setLoading(true);

    router.post(
      "/login/modal",
      { email: loginEmail, password: loginPassword },
      {
        onFinish: () => setLoading(false),

        onSuccess: (page) => {
          const p = page as InertiaAuthPage;
          const userObj = p.props?.auth?.user;

          if (userObj?.id) {
            onSuccess?.({
              id: Number(userObj.id),
              name: userObj.name ?? "",
              email: userObj.email ?? "",
              role: userObj.role ?? "",
            });
          }

          setLoginEmail("");
          setLoginPassword("");
        },

        onError: (errs: Record<string, string>) => {
          setLoginErrors(errs || {});
        },
      }
    );
  };

  return (
    <form onSubmit={submitLogin} className="space-y-3 mb-6 text-left">
      {/* Email */}
      <div>
        <label className="text-xs text-slate-300">Email</label>
        <input
          type="email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white"
          required
        />
        {loginErrors.email && (
          <p className="text-red-400 text-xs mt-1">{loginErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="text-xs text-slate-300">Password</label>
        <input
          type="password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white"
          required
        />
        {loginErrors.password && (
          <p className="text-red-400 text-xs mt-1">{loginErrors.password}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        {loading ? (
          "Logging in..."
        ) : (
          <>
            <LogIn size={16} className="inline mr-2" />
            Secure Login
          </>
        )}
      </Button>
    </form>
  );
}

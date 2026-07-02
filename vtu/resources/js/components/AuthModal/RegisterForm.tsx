import React, { useState } from "react";
import { UserPlus } from "lucide-react";
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

interface RegisterFormProps {
  onSuccess?: (user: User) => void;
}

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

const Button = ({
  children,
  className,
  disabled,
  type = "button",
  onClick,
}: ButtonProps) => (
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

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regErrors, setRegErrors] = useState<InertiaFormErrors>({});
  const [loading, setLoading] = useState(false);

  const submitRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegErrors({});
    setLoading(true);

    router.post(
      "/register/modal",
      {
        name: regName,
        email: regEmail,
        password: regPassword,
        password_confirmation: regPasswordConfirm,
      },
      {
        onFinish: () => setLoading(false),

        onSuccess: (page) => {
          const userObj = (page as InertiaAuthPage).props?.auth?.user;

          if (userObj?.id) {
            onSuccess?.({
              id: Number(userObj.id),
              name: userObj.name ?? "",
              email: userObj.email ?? "",
              role: userObj.role ?? "",
            });
          }

          setRegName("");
          setRegEmail("");
          setRegPassword("");
          setRegPasswordConfirm("");
        },

        onError: (errs: InertiaFormErrors) => {
          setRegErrors(errs || {});
        },
      }
    );
  };

  return (
    <form onSubmit={submitRegister} className="space-y-3 mb-6 text-left">
      {/* Name */}
      <div>
        <label className="text-xs text-slate-300">Full Name</label>
        <input
          type="text"
          value={regName}
          onChange={(e) => setRegName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white"
          required
        />
        {regErrors.name && (
          <p className="text-red-400 text-xs mt-1">{regErrors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="text-xs text-slate-300">Email</label>
        <input
          type="email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white"
          required
        />
        {regErrors.email && (
          <p className="text-red-400 text-xs mt-1">{regErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="text-xs text-slate-300">Password</label>
        <input
          type="password"
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white"
          required
        />
        {regErrors.password && (
          <p className="text-red-400 text-xs mt-1">{regErrors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="text-xs text-slate-300">Confirm Password</label>
        <input
          type="password"
          value={regPasswordConfirm}
          onChange={(e) => setRegPasswordConfirm(e.target.value)}
          placeholder="Confirm password"
          className="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-white"
          required
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        {loading ? (
          "Creating Account..."
        ) : (
          <>
            <UserPlus size={16} className="inline mr-2" />
            Create Account
          </>
        )}
      </Button>
    </form>
  );
}

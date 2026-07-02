import React, { useState } from "react";
import { Sparkles, LogIn, UserPlus } from "lucide-react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import type { User } from "@/lib/types";

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: (u: User) => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Unified callback from LoginForm + RegisterForm
  const handleAuthSuccess = (user: User) => {
    onSuccess?.(user);
    onClose();
  };

  return (
    <div className="text-center">
      <Sparkles className="mx-auto mb-3 text-white" size={24} />

      <h3 className="font-semibold text-xl text-white mb-2">
        {isLoginMode ? "Log In" : "Register"} to Continue
      </h3>

      {/* Toggle Buttons */}
      <div className="flex justify-center bg-white/5 rounded-full p-1 mb-5 mx-auto w-fit">
        <button
          type="button"
          onClick={() => setIsLoginMode(true)}
          className={`px-4 py-1.5 text-xs rounded-full transition ${
            isLoginMode ? "bg-white/10 text-white" : "text-slate-400"
          }`}
        >
          <LogIn size={14} className="inline mr-1" />
          Login
        </button>

        <button
          type="button"
          onClick={() => setIsLoginMode(false)}
          className={`px-4 py-1.5 text-xs rounded-full transition ${
            !isLoginMode ? "bg-white/10 text-white" : "text-slate-400"
          }`}
        >
          <UserPlus size={14} className="inline mr-1" />
          Register
        </button>
      </div>

      {/* Forms */}
      {isLoginMode ? (
        <LoginForm onSuccess={handleAuthSuccess} />
      ) : (
        <RegisterForm onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

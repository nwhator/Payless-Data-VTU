import React, { useState } from "react";
import { router, usePage, Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";

interface PageProps extends Record<string, unknown> {
  status?: string;
  canResetPassword?: boolean;
  old?: { email?: string };
  errors?: Record<string, string | string[]>;
}

export default function Login() {
  const { props } = usePage<PageProps>();
  const [email, setEmail] = useState<string>(String(props.old?.email ?? ""));
  const [password, setPassword] = useState<string>("");
  const [remember, setRemember] = useState(false);
  const [processing, setProcessing] = useState(false);
  const errors = props.errors ?? {};
  
  const { url } = usePage();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    router.post(
      "/login",
      { email, password, remember },
      {
        onError: () => setProcessing(false),
        onFinish: () => setProcessing(false),
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-md">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link href={url} className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 border border-blue-100 overflow-hidden">
              <img
                src="/assets/images/logo.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
            </Link>

            <div>
              <div className="text-lg font-semibold text-gray-800">
                Payless Data Portal
              </div>
              <div className="text-xs text-gray-500">
                Log in to your account
              </div>
            </div>
          </div>


          {/* Login form */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-5">
            Enter your credentials to continue.
          </p>

          {props.status && (
            <div className="mb-4 text-sm text-green-600 text-center font-medium">
              {props.status}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-gray-700 text-sm">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="mt-1"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {Array.isArray(errors.email)
                    ? errors.email.join(", ")
                    : errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-700 text-sm">
                  Password
                </Label>
                {props.canResetPassword && (
                  <a
                    href="/forgot-password"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-1"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {Array.isArray(errors.password)
                    ? errors.password.join(", ")
                    : errors.password}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="remember" className="text-gray-600 text-sm">
                Remember me
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full justify-center"
              disabled={processing}
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader /> Logging in...
                </div>
              ) : (
                "Log in"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Don’t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Payless Data. All rights reserved.
        </div>
      </div>
    </div>
  );
}

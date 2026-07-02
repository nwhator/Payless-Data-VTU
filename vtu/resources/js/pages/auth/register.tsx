import React, { useState } from "react";
import { router, usePage, Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";

interface PageProps extends Record<string, unknown> {
  old?: { name?: string; email?: string };
  errors?: Record<string, string | string[]>;
}

export default function Register() {
  const { props } = usePage<PageProps>();
  const [name, setName] = useState<string>(String(props.old?.name ?? ""));
  const [email, setEmail] = useState<string>(String(props.old?.email ?? ""));
  const [password, setPassword] = useState<string>("");
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const errors = props.errors ?? {};

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    router.post(
      "/register",
      {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      },
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
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 border border-blue-100">
              <Link href="/" className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 border border-blue-100 overflow-hidden">
                            <img
                              src="/assets/images/logo.png"
                              alt="Logo"
                              className="w-10 h-10 object-contain"
                            />
                          </Link>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">
                Smart Top-Up Portal
              </div>
              <div className="text-xs text-gray-500">
                Create your account
              </div>
            </div>
          </div>

          {/* Register form */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Get started
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Fill in your details to create a new account.
          </p>

          <form onSubmit={submit} className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-gray-700 text-sm">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {Array.isArray(errors.name)
                    ? errors.name.join(", ")
                    : errors.name}
                </p>
              )}
            </div>

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
              <Label htmlFor="password" className="text-gray-700 text-sm">
                Password
              </Label>
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

            {/* Confirm Password */}
            <div>
              <Label
                htmlFor="password_confirmation"
                className="text-gray-700 text-sm"
              >
                Confirm Password
              </Label>
              <Input
                id="password_confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                placeholder="Repeat your password"
                className="mt-1"
              />
              {errors.password_confirmation && (
                <p className="text-red-500 text-xs mt-1">
                  {Array.isArray(errors.password_confirmation)
                    ? errors.password_confirmation.join(", ")
                    : errors.password_confirmation}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full justify-center mt-2"
              disabled={processing}
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader /> Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SmartTopUp. All rights reserved.
        </div>
      </div>
    </div>
  );
}

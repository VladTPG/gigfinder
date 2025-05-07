"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resetPassword } from "@/lib/firebase/auth";
import ProtectedRoute from "@/components/auth/protected-route";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess(
        "Password reset email sent. Check your inbox for further instructions."
      );
      setEmail("");
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send password reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false} redirectTo="/">
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="GigFinder Logo"
              width={180}
              height={50}
            />
          </div>

          <div className="bg-card rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-6">
              Reset Password
            </h1>

            {error && (
              <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-accent/20 text-accent text-sm p-3 rounded-lg mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                >
                  Your Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-accent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg shadow transition-colors"
              >
                {isLoading ? "Sending Email..." : "Send Reset Link"}
              </button>
            </form>

            <div className="text-center mt-6 text-sm">
              Remember your password?{" "}
              <Link href="/signin" className="text-accent hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

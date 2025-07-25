"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/firebase/auth";
import { signInWithGoogle } from "@/lib/firebase/auth-providers";
import { getDocumentById } from "@/lib/firebase/firestore";
import { IUser } from "@/lib/types";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signIn(email, password);
      const user = userCredential.user;
      
      // Give a moment for the auth context to update
      setTimeout(async () => {
        try {
          // Check if user has completed profile setup
          const userDoc = await getDocumentById<IUser>("users", user.uid);

          if (!userDoc || !userDoc.role) {
            // User hasn't set up their profile yet, redirect to profile setup
            console.log("Email signin: Redirecting to profile-setup - no role found");
            router.push("/profile-setup");
          } else {
            // User already has a role, go to feed
            console.log("Email signin: Redirecting to feed - role found:", userDoc.role);
            router.push("/feed");
          }
        } catch (fetchError) {
          console.error("Error fetching user profile after email signin:", fetchError);
          // If we can't fetch the profile, assume they need to set it up
          router.push("/profile-setup");
        }
      }, 500);
    } catch (err: Error | unknown) {
      console.error("Sign in error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to sign in. Please check your credentials.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const user = await signInWithGoogle();

      // Give a moment for the auth context to update
      setTimeout(async () => {
        try {
          // Check if this is a first-time login or user hasn't completed profile setup
          const userDoc = await getDocumentById<IUser>("users", user.uid);

          if (!userDoc || !userDoc.role) {
            // User hasn't set up their profile yet, redirect to profile setup
            console.log("Google signin: Redirecting to profile-setup - no role found");
            router.push("/profile-setup");
          } else {
            // User already has a role, go to feed
            console.log("Google signin: Redirecting to feed - role found:", userDoc.role);
            router.push("/feed");
          }
        } catch (fetchError) {
          console.error("Error fetching user profile after Google signin:", fetchError);
          // If we can't fetch the profile, assume they need to set it up
          router.push("/profile-setup");
        }
      }, 500);
    } catch (err: Error | unknown) {
      console.error("Google sign in error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in with Google.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="GigFinder Logo" width={180} height={50} />
        </div>

        <div className="bg-card rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>

          {error && (
            <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-accent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg shadow transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="relative flex items-center justify-center mt-6 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative px-4 bg-card text-sm text-muted-foreground">
              Or continue with
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-2 px-4 border border-input bg-background hover:bg-muted rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Google
          </button>

          <div className="text-center mt-6 text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

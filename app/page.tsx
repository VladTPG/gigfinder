"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useEffect, useState } from "react";

export default function RedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [debugMessage, setDebugMessage] = useState<string>("");
  const [redirected, setRedirected] = useState(false);

  // Add an intentional small delay to ensure auth state is fully resolved
  useEffect(() => {
    console.log("Root page loaded, auth state:", { user: !!user, isLoading });

    // Only redirect if not already redirecting and auth is not loading
    if (!isLoading && !redirected) {
      // Give a small delay to ensure any state transitions have settled
      const timer = setTimeout(() => {
        if (user) {
          console.log("User authenticated, redirecting to /feed");
          setDebugMessage("Authenticated - redirecting to feed");
          setRedirected(true);
          router.replace("/feed");
        } else {
          console.log("Not authenticated, redirecting to signin");
          setDebugMessage("Not authenticated - redirecting to signin");
          setRedirected(true);
          router.replace("/signin");
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, redirected, router]);

  // Show loading indicator with debug info
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Loading authentication state..."
          : debugMessage || "Preparing to redirect..."}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        If stuck on this screen, try refreshing the page.
      </p>
    </div>
  );
}

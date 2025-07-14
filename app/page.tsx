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
    console.log("ROOT PAGE LOADED - auth state:", { user: !!user, isLoading });
    console.log("ROOT PAGE - Current URL:", window.location.href);
    console.log("ROOT PAGE - Pathname:", window.location.pathname);

    // Only redirect if not already redirecting and auth is not loading
    if (!isLoading && !redirected) {
      // Give a small delay to ensure any state transitions have settled
      const timer = setTimeout(() => {
        if (user) {
          // Check if there's a stored intended destination from before refresh
          const lastVisitedPath = localStorage.getItem('lastVisitedPath');
          const redirectPath = lastVisitedPath || "/feed";
          
          console.log("User authenticated, redirecting to", redirectPath);
          console.log("Last visited path:", lastVisitedPath);
          setDebugMessage(`Authenticated - redirecting to ${redirectPath}`);
          setRedirected(true);
          
          router.replace(redirectPath);
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

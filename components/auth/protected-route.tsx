"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/signin",
}: ProtectedRouteProps) {
  const { user, userProfile, isLoading, error, authInitialized } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    console.log("Protected route conditions:", {
      user: !!user,
      userProfile: !!userProfile,
      userRole: userProfile?.role,
      isLoading,
      authInitialized,
      requireAuth,
      redirectTo,
      redirecting,
    });

    // Only make redirect decisions AFTER Firebase auth has initialized
    if (!isLoading && authInitialized && !redirecting) {
      // If we require auth and there's no user, redirect to sign in
      if (requireAuth && !user) {
        console.log("Redirecting to signin - no authenticated user");
        setRedirecting(true);
        router.replace(redirectTo);
        return;
      }

      // If user is authenticated but has no role and we're not on profile-setup, redirect to profile setup
      if (requireAuth && user && userProfile && !userProfile.role && window.location.pathname !== "/profile-setup") {
        console.log("Redirecting to profile-setup - user has no role");
        setRedirecting(true);
        router.replace("/profile-setup");
        return;
      }

      // If we require no auth (like sign in page) and there's a user, redirect to stored path or feed
      if (!requireAuth && user) {
        const lastVisitedPath = localStorage.getItem('lastVisitedPath');
        const redirectPath = lastVisitedPath || "/feed";
        
        console.log("PROTECTED ROUTE - Redirecting authenticated user");
        console.log("PROTECTED ROUTE - Current URL:", window.location.href);
        console.log("PROTECTED ROUTE - Redirecting to:", redirectPath);
        
        setRedirecting(true);
        router.replace(redirectPath);
      }
    }
  }, [user, userProfile, isLoading, authInitialized, requireAuth, redirectTo, router, redirecting]);

  // Show debug info if loading takes too long
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowDebug(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show loading indicator while auth is loading or not yet initialized
  if (isLoading || !authInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
        <p className="text-muted-foreground text-sm">
          Verifying authentication...
        </p>
        {showDebug && (
          <div className="mt-4 text-xs text-muted-foreground max-w-xs text-center">
            <p>
              Taking longer than expected. If this persists, try refreshing the
              page.
            </p>
            {error && <p className="text-destructive mt-2">{error}</p>}
          </div>
        )}
      </div>
    );
  }

  // If we require auth and there's no user, or if we require no auth and there is a user,
  // we'll be redirecting, so show a loading indicator
  if ((requireAuth && !user) || (!requireAuth && user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      </div>
    );
  }

  // Otherwise, render the children
  return <>{children}</>;
}

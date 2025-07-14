"use client";

import { useAuth } from "@/lib/context/auth-context-fix";
import { DesktopLayout } from "../layouts/desktop/layout";
import { MobileLayout } from "../layouts/mobile/layout";
import ProtectedRoute from "@/components/auth/protected-route";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isLoading } = useAuth();
  const pathname = usePathname();

  // Store current path for refresh preservation
  useEffect(() => {
    if (user && pathname) {
      // Store the current path so we can return here after refresh
      localStorage.setItem('lastVisitedPath', pathname);
      console.log('Authenticated layout - storing path:', pathname);
      console.log('Current URL:', window.location.href);
    }
  }, [user, pathname]);

  // Add debugging
  useEffect(() => {
    console.log("Authenticated layout rendered:", {
      hasUser: !!user,
      hasProfile: !!userProfile,
      isLoading,
    });
  }, [user, userProfile, isLoading]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <DesktopLayout>{children}</DesktopLayout>
        <MobileLayout>{children}</MobileLayout>
      </div>
    </ProtectedRoute>
  );
}

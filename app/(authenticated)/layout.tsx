"use client";

import { useAuth } from "@/lib/context/auth-context-fix";
import { DesktopLayout } from "../layouts/desktop/layout";
import { MobileLayout } from "../layouts/mobile/layout";
import ProtectedRoute from "@/components/auth/protected-route";
import { useEffect } from "react";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isLoading } = useAuth();

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

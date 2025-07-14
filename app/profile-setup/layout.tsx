"use client";

import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/lib/context/auth-context-fix";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ProfileSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Store current path for refresh preservation
  useEffect(() => {
    if (user && pathname) {
      localStorage.setItem('lastVisitedPath', pathname);
      console.log('Stored path for refresh preservation:', pathname);
    }
  }, [user, pathname]);

  return (
    <ProtectedRoute requireAuth={true} redirectTo="/signin">
      {children}
    </ProtectedRoute>
  );
}

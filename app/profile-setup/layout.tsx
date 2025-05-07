"use client";

import ProtectedRoute from "@/components/auth/protected-route";

export default function ProfileSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAuth={true} redirectTo="/signin">
      {children}
    </ProtectedRoute>
  );
}

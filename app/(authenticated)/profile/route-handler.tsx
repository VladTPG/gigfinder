"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { UserRole } from "@/lib/types";

export default function ProfileRouteHandler() {
  const { userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the user profile is loaded and the user is a manager
    if (userProfile && userProfile.role === UserRole.MANAGER) {
      router.push("/venue-profile");
    }
  }, [userProfile, router]);

  return null; // This component doesn't render anything, just handles redirection
}

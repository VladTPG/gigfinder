"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { UserRole } from "@/lib/types";

export default function ProfileRouteHandler() {
  const { userProfile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect if we have a user profile, it's not loading, we haven't redirected yet,
    // and the user is specifically on the /profile page (not a subpage like /profile/edit)
    if (
      userProfile &&
      !isLoading &&
      !hasRedirected &&
      pathname === "/profile" &&
      userProfile.role === UserRole.MANAGER
    ) {
      console.log(
        "Manager detected on /profile, redirecting to /venue-profile"
      );
      setHasRedirected(true);
      router.replace("/venue-profile");
    }
  }, [userProfile, isLoading, hasRedirected, pathname, router]);

  return null; // This component doesn't render anything, just handles redirection
}

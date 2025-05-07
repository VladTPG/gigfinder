"use client";

import { useAuth } from "@/lib/context/auth-context-fix";
import { signOut } from "@/lib/firebase/auth";
import Link from "next/link";

export default function FeedPage() {
  const { user, userProfile, error } = useAuth();

  const handleRefreshAuth = async () => {
    if (user) {
      try {
        console.log("Manually refreshing auth token");
        await user.getIdToken(true);
        console.log("Auth token refreshed, reloading page");
        window.location.reload();
      } catch (err) {
        console.error("Error refreshing auth token:", err);
        alert(
          "Failed to refresh authentication. Please try signing out and in again."
        );
      }
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            Welcome to Your Feed!
          </h1>

          <div className="bg-secondary/20 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-2">Your Profile</h2>
            {error ? (
              <div className="bg-destructive/20 text-destructive p-3 rounded-lg mb-2">
                <p className="font-medium">Error: {error}</p>
                <p className="text-sm mt-1 mb-3">
                  Please try refreshing your authentication or signing out and
                  signing in again.
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <button
                    onClick={handleRefreshAuth}
                    className="px-3 py-1 bg-accent text-accent-foreground rounded-md text-sm"
                  >
                    Refresh Authentication
                  </button>
                </div>
              </div>
            ) : userProfile ? (
              <div>
                <p className="mb-2">
                  Username:{" "}
                  <span className="text-accent font-medium">
                    {userProfile.profile.username}
                  </span>
                </p>
                <p className="mb-2">
                  Email:{" "}
                  <span className="text-accent font-medium">
                    {userProfile.email}
                  </span>
                </p>
                <p className="mb-2">
                  Role:{" "}
                  <span className="text-accent font-medium">
                    {userProfile?.role}
                  </span>
                </p>
              </div>
            ) : (
              <p>Loading profile information...</p>
            )}
          </div>

          <p className="text-muted-foreground">
            This is your feed. From here you can explore bands, gigs, and
            connect with other musicians.
          </p>
        </div>
      </div>
    </main>
  );
}

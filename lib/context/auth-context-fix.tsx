"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange, getCurrentUser } from "@/lib/firebase/auth";
import { getDocumentById } from "@/lib/firebase/firestore";
import { IUser } from "@/lib/types";
import { UserRole } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  userProfile: IUser | null;
  isLoading: boolean;
  error: string | null;
  authInitialized: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  error: null,
  authInitialized: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    console.log("Auth provider initializing");

    // Force a state update if stuck for more than 10 seconds
    timeoutId = setTimeout(async () => {
      if (isMounted && isLoading) {
        console.warn("Auth loading timed out - attempting reauthentication");

        // Try to get current user one last time
        const currentUser = getCurrentUser();
        if (currentUser && !user) {
          console.log("Current user found, setting user:", currentUser.email);
          setUser(currentUser);

          try {
            // Attempt to refresh the auth token
            await currentUser.getIdToken(true);
            console.log("Auth token refreshed successfully");

            // After token refresh, try one more profile fetch
            try {
              console.log("Attempting final profile fetch after token refresh");
              const profile = await getDocumentById<IUser>(
                "users",
                currentUser.uid
              );

              if (profile) {
                console.log(
                  "Profile loaded after token refresh:",
                  profile.email
                );
                setUserProfile(profile);
                setError(null);
                setIsLoading(false);
                return; // Exit if successful
              }
            } catch (fetchErr) {
              console.error(
                "Failed to fetch profile after token refresh:",
                fetchErr
              );
            }
          } catch (tokenErr) {
            console.error("Failed to refresh auth token:", tokenErr);
          }
        }

        // If we get here, all recovery attempts failed
        setIsLoading(false);

        if (currentUser && !userProfile) {
          // Create a basic fallback profile if we have a user but no profile
          const fallbackProfile = {
            id: currentUser.uid,
            email: currentUser.email || "",
            profile: {
              username:
                currentUser.displayName ||
                currentUser.email?.split("@")[0] ||
                "User",
              instruments: [],
              genres: [],
              location: "",
              profilePicture: currentUser.photoURL || "",
            },
            role: null as any, // Set to null to ensure user goes through onboarding
            followers: [],
            following: [],
            videos: [],
          } as unknown as IUser;

          setUserProfile(fallbackProfile);
        }

        setError(
          "Authentication timed out. Please try refreshing the page or signing out and signing back in."
        );
      }
    }, 10000);

    // Create a simple profile if fetch fails
    const createFallbackProfile = (user: User) => {
      console.log("Creating fallback profile");
      return {
        id: user.uid,
        email: user.email || "",
        profile: {
          username: user.displayName || user.email?.split("@")[0] || "User",
          instruments: [],
          genres: [],
          location: "",
          profilePicture: user.photoURL || "",
        },
        role: null, // Set to null to ensure user goes through profile setup
        followers: [],
        following: [],
        videos: [],
      } as unknown as IUser;
    };

    // Fetch user profile with retry mechanism
    const fetchProfileWithRetry = async (userId: string, retries = 2) => {
      let lastError = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          console.log(
            `Fetching profile for ${userId} (attempt ${attempt + 1}/${
              retries + 1
            })`
          );
          const profile = await getDocumentById<IUser>("users", userId);

          if (!isMounted) return null;

          if (profile) {
            console.log("Profile found:", profile.email);
            return profile;
          } else if (attempt === retries) {
            console.warn("No profile found after all attempts");
            return null;
          }
        } catch (err: any) {
          console.error(
            `Error fetching profile (attempt ${attempt + 1}):`,
            err
          );
          lastError = err;

          if (attempt < retries) {
            // Wait a bit before retrying (increasing delay with each attempt)
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (attempt + 1))
            );
          }
        }
      }

      throw lastError;
    };

    // Don't try to get current user synchronously - let onAuthChange handle it
    // This prevents the race condition where getCurrentUser() returns null before Firebase auth initializes
    console.log("Auth provider will wait for onAuthChange to determine auth state");

    // Set up auth state change listener - this is the primary way to handle auth state
    const unsubscribe = onAuthChange(async (authUser) => {
      if (!isMounted) return;

      console.log("Auth state changed:", authUser?.email || "signed out");
      setUser(authUser);
      setAuthInitialized(true); // Mark auth as initialized after first callback

      if (authUser) {
        try {
          console.log("Fetching profile after auth change");
          const profile = await fetchProfileWithRetry(authUser.uid);

          if (!isMounted) return;

          if (profile) {
            console.log("Profile loaded after auth change");
            setUserProfile(profile);
            setError(null);
          } else {
            console.warn("No profile after auth change");
            const fallback = createFallbackProfile(authUser);
            setUserProfile(fallback);
            setError(
              "Profile not found after signing in. Using basic account information."
            );
          }
        } catch (err: any) {
          console.error("Error fetching profile after auth change:", err);
          if (isMounted) {
            const fallback = createFallbackProfile(authUser);
            setUserProfile(fallback);
            setError(`Profile load error: ${err.message || "Unknown error"}`);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setUserProfile(null);
          setIsLoading(false);
        }
      }
    });

    // Clean up the listener and timeout on unmount
    return () => {
      console.log("Auth provider cleaning up");
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // For debugging
  useEffect(() => {
    if (userProfile) {
      console.log("User profile details:", {
        email: userProfile.email,
        role: userProfile.role,
        username: userProfile.profile.username,
        instruments: userProfile.profile.instruments,
        hasFirstName: !!userProfile.profile.firstName,
        hasLastName: !!userProfile.profile.lastName,
      });
    }

    console.log("Auth state updated:", {
      hasUser: !!user,
      hasProfile: !!userProfile,
      isLoading,
      hasError: !!error,
    });
  }, [user, userProfile, isLoading, error]);

  // Function to manually refresh the user profile
  const refreshProfile = async () => {
    if (!user) {
      console.warn("Cannot refresh profile: no authenticated user");
      return;
    }

    console.log("Manually refreshing user profile");
    setError(null);

    try {
      const profile = await getDocumentById<IUser>("users", user.uid);
      if (profile) {
        console.log("Profile refreshed successfully:", profile.email);
        setUserProfile(profile);
      } else {
        console.warn("No profile found during manual refresh");
        setError("Profile not found");
      }
    } catch (err: any) {
      console.error("Error refreshing profile:", err);
      setError(`Failed to refresh profile: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, isLoading, error, authInitialized, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

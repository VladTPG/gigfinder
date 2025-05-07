"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange, getCurrentUser } from "@/lib/firebase/auth";
import { getDocumentById } from "@/lib/firebase/firestore";
import { IUser } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  userProfile: IUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if there's a user already logged in
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);

      // Fetch user profile from Firestore
      getDocumentById<IUser>("users", currentUser.uid)
        .then((profile) => {
          setUserProfile(profile);
        })
        .catch((error) => {
          console.error("Error fetching user profile:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    // Set up auth state change listener
    const unsubscribe = onAuthChange(async (authUser) => {
      setIsLoading(true);
      setUser(authUser);

      if (authUser) {
        try {
          const profile = await getDocumentById<IUser>("users", authUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }

      setIsLoading(false);
    });

    // Clean up the listener on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

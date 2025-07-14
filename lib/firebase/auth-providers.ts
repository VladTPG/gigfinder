import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./config";
import {
  createDocumentWithId,
  getDocumentById,
  updateDocument,
} from "./firestore";
import { IUser, UserRole } from "@/lib/types";
import { serverTimestamp } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user document already exists
    const existingUser = await getDocumentById<IUser>("users", user.uid);

    // If no document exists, create one (new user)
    if (!existingUser) {
      const userData: Omit<IUser, "id"> = {
        email: user.email || "",
        password: "", // Google Auth users don't have a password
        role: null as any, // Set to null initially so user can select in profile setup
        profile: {
          username: user.displayName || user.email?.split("@")[0] || "",
          bio: "",
          instruments: [],
          genres: [],
          profilePicture: user.photoURL || "",
          location: "",
        },
        followers: [],
        following: [],
        followingUsers: [],
        followingBands: [],
        videos: [],
        bands: [], // Initialize empty bands array
        bandInvitations: [], // Initialize empty band invitations array
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await createDocumentWithId<IUser>("users", user.uid, userData);
    }
    // If user exists but their Google profile picture URL has changed or is empty in our database
    else if (
      user.photoURL &&
      (!existingUser.profile.profilePicture ||
        existingUser.profile.profilePicture !== user.photoURL)
    ) {
      // Update just the profile picture field
      await updateDocument("users", user.uid, {
        profile: {
          ...existingUser.profile,
          profilePicture: user.photoURL,
        },
        updatedAt: serverTimestamp(),
      });
    }

    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  UserCredential,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "./config";
import { createDocumentWithId, getDocumentById } from "./firestore";
import { IUser, UserRole } from "@/lib/types";
import { serverTimestamp } from "firebase/firestore";
import * as bcryptjs from "bcryptjs";

// Register a new user
export const registerUser = async (
  email: string,
  password: string,
  username: string
): Promise<User> => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update profile display name
    await updateProfile(user, { displayName: username });

    // Hash password for Firestore storage
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user document in Firestore
    const userData: Omit<IUser, "id"> = {
      email: email,
      password: hashedPassword,
      role: null as any, // Set to null initially so user can select in profile setup
      profile: {
        username: username,
        bio: "",
        instruments: [],
        genres: [],
        profilePicture: "",
        location: "",
      },
      followers: [],
      following: [],
      videos: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await createDocumentWithId<IUser>("users", user.uid, userData);

    return user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

// Sign in existing user
export const signIn = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Verify password against stored hash
export const verifyPassword = async (
  userId: string,
  password: string
): Promise<boolean> => {
  try {
    const user = await getDocumentById<IUser>("users", userId);
    if (!user) return false;

    return bcryptjs.compare(password, user.password);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  return firebaseSignOut(auth);
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

// Reauthenticate user before sensitive operations
export const reauthenticate = async (
  password: string
): Promise<UserCredential> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("User not logged in");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  return reauthenticateWithCredential(user, credential);
};

import { FieldValue, serverTimestamp } from "firebase/firestore";

export enum UserRole {
  MUSICIAN = "musician",
  MANAGER = "manager",
  ADMIN = "admin",
}

export interface IProfile {
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  instruments: string[];
  genres: string[];
  profilePicture?: string;
  location: string;
}

export interface IManagerProfile extends IProfile {
  venueId: string;
  venueName: string;
  venuePhotos: string[];
  publishedGigs: string[];
  contactEmail?: string;
  contactPhone?: string;
}

export interface IUser {
  id: string; // Firestore document ID
  email: string;
  password: string;
  role: UserRole;
  profile: IProfile | IManagerProfile;
  followers: string[]; // Array of user IDs
  following: string[]; // Array of user IDs (deprecated - use followingUsers)
  followingUsers: string[]; // Array of user IDs
  followingBands: string[]; // Array of band IDs
  videos: string[]; // Array of video IDs
  bands: string[]; // Array of band IDs user is member of
  bandInvitations: string[]; // Array of pending invitation IDs
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

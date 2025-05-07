import { serverTimestamp } from "firebase/firestore";
import { Genres } from "./genres";

export interface IBand {
  id: string; // Firestore document ID
  name: string;
  members: string[]; // Array of user IDs
  genres: Genres[];
  bio?: string;
  profilePicture?: string;
  videos: string[]; // Array of video IDs
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

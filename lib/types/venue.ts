import { serverTimestamp } from "firebase/firestore";

export interface IVenue {
  id: string; // Firestore document ID
  name: string;
  location: string;
  images: string[];
  manager: string; // User ID of the manager
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

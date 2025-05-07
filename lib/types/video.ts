import { serverTimestamp } from "firebase/firestore";

export interface IVideo {
  id: string; // Firestore document ID
  title: string;
  artist: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

import { serverTimestamp } from "firebase/firestore";

export interface IVideo {
  id: string; // Firestore document ID
  title: string;
  artist: string;
  videoUrl: string; // Full video URL (YouTube or other)
  youtubeId?: string; // YouTube video ID extracted from URL
  thumbnailUrl: string;
  userId: string; // ID of the user who uploaded this video
  bandId?: string; // ID of the band this video belongs to (optional)
  genres: string[]; // Array of genre tags
  instruments: string[]; // Array of instrument tags
  description?: string; // Optional description
  isYouTube: boolean; // Flag to indicate if this is a YouTube video
  isBandVideo: boolean; // Flag to indicate if this is a band video
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

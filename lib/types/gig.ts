import { serverTimestamp } from "firebase/firestore";
import { Genres } from "./genres";

export enum GigStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum ApplicationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface IGig {
  id: string; // Firestore document ID
  title: string;
  description: string;
  venueId: string; // Reference to venue
  venueName: string; // Denormalized for easier display
  date: Date;
  startTime: string; // Format: "20:00"
  endTime: string; // Format: "23:00"
  genres: Genres[]; // Preferred genres
  paymentAmount?: number; // Optional payment
  paymentCurrency?: string; // e.g., "USD", "EUR"
  requirements?: string; // Special requirements or notes
  maxApplicants?: number; // Maximum number of bands/musicians that can apply
  status: GigStatus;
  createdBy: string; // User ID of the venue manager
  applications: string[]; // Array of application IDs
  acceptedApplicants: string[]; // Array of band/musician IDs that were accepted
  images?: string[]; // Optional gig poster/promotional images
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

export interface IGigApplication {
  id: string; // Firestore document ID
  gigId: string;
  applicantId: string; // Band or musician ID
  applicantType: "musician" | "band";
  applicantName: string; // Denormalized for easier display
  message?: string; // Optional application message
  status: ApplicationStatus;
  appliedAt: typeof serverTimestamp;
  respondedAt?: typeof serverTimestamp;
  responseMessage?: string; // Optional response from venue manager
}

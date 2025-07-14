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
  
  // Enhanced gig features
  gigType?: GigType;
  duration?: number; // Duration in minutes
  setupTime?: number; // Setup time in minutes before start
  soundCheckTime?: number; // Sound check time in minutes
  
  // Audience & Promotion
  expectedAttendance?: number;
  ageRestriction?: AgeRestriction;
  ticketPrice?: number;
  isTicketed?: boolean;
  promotionBudget?: number;
  
  // Technical Requirements
  technicalRequirements?: {
    soundSystem?: boolean;
    lighting?: boolean;
    backline?: string[]; // ["drums", "bass_amp", "guitar_amp"]
    powerRequirements?: string;
    stageSize?: string;
  };
  
  // Application Settings
  applicationDeadline?: Date;
  autoAcceptApplications?: boolean;
  requiresAudition?: boolean;
  auditionDetails?: string;
  
  // Performance Details
  setLength?: number; // Set length in minutes
  numberOfSets?: number;
  breakDuration?: number; // Break between sets in minutes
  
  // Location Details (for outdoor/special venues)
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Recurring Gig Information
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  parentGigId?: string; // For recurring gigs
  
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

export enum GigType {
  LIVE_MUSIC = "live_music",
  OPEN_MIC = "open_mic",
  ACOUSTIC_SET = "acoustic_set",
  FULL_BAND = "full_band",
  DJ_SET = "dj_set",
  KARAOKE = "karaoke",
  BACKGROUND_MUSIC = "background_music",
  WEDDING = "wedding",
  CORPORATE_EVENT = "corporate_event",
  FESTIVAL = "festival",
  PRIVATE_PARTY = "private_party",
  CHARITY_EVENT = "charity_event",
  BATTLE_OF_BANDS = "battle_of_bands",
  SHOWCASE = "showcase",
  RESIDENCY = "residency"
}

export enum AgeRestriction {
  ALL_AGES = "all_ages",
  EIGHTEEN_PLUS = "18+",
  TWENTY_ONE_PLUS = "21+"
}

export interface RecurringPattern {
  frequency: "weekly" | "monthly" | "custom";
  interval: number; // Every X weeks/months
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  endDate?: Date;
  maxOccurrences?: number;
}

export interface IGigApplication {
  id: string; // Firestore document ID
  gigId: string;
  applicantId: string; // Band leader's ID (for band applications) or musician ID (for individual applications)
  applicantType: "musician" | "band";
  applicantName: string; // Denormalized for easier display
  message?: string; // Optional application message
  status: ApplicationStatus;
  appliedAt: typeof serverTimestamp;
  respondedAt?: typeof serverTimestamp;
  responseMessage?: string; // Optional response from venue manager
  bandId?: string; // Band ID (only for band applications)
}

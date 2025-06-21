import { serverTimestamp } from "firebase/firestore";

export interface IVenue {
  id: string; // Firestore document ID
  name: string;
  location: string;
  images: string[];
  manager: string; // User ID of the manager
  
  // Enhanced venue information
  description?: string;
  capacity?: number;
  venueType?: VenueType;
  amenities?: string[]; // ["sound_system", "lighting", "parking", "bar", "kitchen"]
  equipment?: string[]; // ["microphones", "speakers", "drums", "piano", "guitar_amps"]
  
  // Contact & Social
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  
  // Business Information
  businessHours?: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  priceRange?: PriceRange;
  
  // Verification & Quality
  isVerified?: boolean;
  verificationDate?: Date;
  rating?: number; // Average rating from reviews
  reviewCount?: number;
  
  // Availability
  availabilityCalendar?: { [date: string]: boolean }; // YYYY-MM-DD format
  blackoutDates?: string[]; // Dates when venue is unavailable
  
  // Settings
  autoAcceptApplications?: boolean;
  requiresApproval?: boolean;
  applicationDeadlineHours?: number; // Hours before gig when applications close
  
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

export enum VenueType {
  BAR = "bar",
  CLUB = "club",
  RESTAURANT = "restaurant",
  CONCERT_HALL = "concert_hall",
  THEATER = "theater",
  OUTDOOR = "outdoor",
  PRIVATE_EVENT = "private_event",
  FESTIVAL = "festival",
  COFFEE_SHOP = "coffee_shop",
  OTHER = "other"
}

export enum PriceRange {
  BUDGET = "budget", // $
  MODERATE = "moderate", // $$
  UPSCALE = "upscale", // $$$
  LUXURY = "luxury" // $$$$
}

// Venue Reviews
export interface IVenueReview {
  id: string;
  venueId: string;
  reviewerId: string; // Musician/band ID
  reviewerName: string;
  rating: number; // 1-5 stars
  comment?: string;
  gigId?: string; // Reference to the gig this review is about
  createdAt: typeof serverTimestamp;
}

// Venue Analytics
export interface IVenueAnalytics {
  venueId: string;
  period: string; // "2024-01" for monthly, "2024-W01" for weekly
  
  // Gig Statistics
  totalGigs: number;
  publishedGigs: number;
  completedGigs: number;
  cancelledGigs: number;
  
  // Application Statistics
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  
  // Revenue
  totalRevenue?: number;
  averageGigPayment?: number;
  
  // Performance
  averageApplicationsPerGig: number;
  applicationAcceptanceRate: number;
  gigCompletionRate: number;
  
  createdAt: typeof serverTimestamp;
}

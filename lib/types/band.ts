import { serverTimestamp } from "firebase/firestore";

export interface IBand {
  id: string; // Firestore document ID
  name: string;
  members: IBandMember[]; // Enhanced member structure
  genres: string[]; // Use same genre system as users
  bio?: string;
  profilePicture?: string;
  location?: string;
  videos: string[]; // Array of video IDs (same as users)
  followers: string[]; // Array of user IDs who follow this band
  following: string[]; // Array of user/band IDs this band follows
  createdBy: string; // User ID of the creator
  isActive: boolean; // Band status
  socialLinks?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    spotify?: string;
  };
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

export interface IBandMember {
  userId: string;
  role: BandMemberRole;
  instruments: string[]; // What they play in this band
  joinedAt: Date;
  isActive: boolean;
  permissions: BandPermission[];
}

export enum BandMemberRole {
  LEADER = "leader", // Can manage everything
  ADMIN = "admin", // Can manage members and content
  MEMBER = "member", // Can add content
  GUEST = "guest" // View only, temporary member
}

export enum BandPermission {
  MANAGE_MEMBERS = "manage_members",
  MANAGE_VIDEOS = "manage_videos", 
  MANAGE_PROFILE = "manage_profile",
  MANAGE_GIGS = "manage_gigs", // For future gig integration
  VIEW_ANALYTICS = "view_analytics" // For future analytics
}

// For band invitations
export interface IBandInvitation {
  id: string;
  bandId: string;
  bandName: string;
  invitedUserId: string;
  invitedBy: string; // User ID who sent invitation
  role: BandMemberRole;
  instruments: string[];
  message?: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export enum InvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted", 
  DECLINED = "declined",
  EXPIRED = "expired"
}

// For band applications (users applying to join bands)
export interface IBandApplication {
  id: string;
  bandId: string;
  bandName: string;
  applicantUserId: string;
  applicantName: string;
  role: BandMemberRole;
  instruments: string[];
  message?: string;
  status: ApplicationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export enum ApplicationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  EXPIRED = "expired"
}

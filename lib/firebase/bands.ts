import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./config";
import { 
  IBand, 
  IBandMember, 
  IBandInvitation, 
  IBandApplication,
  BandMemberRole, 
  BandPermission,
  InvitationStatus,
  ApplicationStatus,
  IUser 
} from "@/lib/types";
import { getDocumentById, updateDocument, addDocument, queryDocuments } from "./firestore";

const BANDS_COLLECTION = "bands";
const INVITATIONS_COLLECTION = "band-invitations";
const APPLICATIONS_COLLECTION = "band-applications";

// Create a new band
export const createBand = async (
  bandData: Omit<IBand, "id" | "createdAt" | "updatedAt">,
  creatorId: string
): Promise<string> => {
  try {
    // Clean the band data to remove undefined values
    const cleanBandData = Object.fromEntries(
      Object.entries(bandData).filter(([_, value]) => value !== undefined)
    ) as Omit<IBand, "id" | "createdAt" | "updatedAt">;

    // Create the band document
    const currentTime = new Date();
    const newBand: Omit<IBand, "id"> = {
      ...cleanBandData,
      createdBy: creatorId,
      isActive: true,
      members: [
        {
          userId: creatorId,
          role: BandMemberRole.LEADER,
          instruments: bandData.members[0]?.instruments || [],
          joinedAt: currentTime as any,
          isActive: true,
          permissions: [
            BandPermission.MANAGE_MEMBERS,
            BandPermission.MANAGE_VIDEOS,
            BandPermission.MANAGE_PROFILE,
            BandPermission.MANAGE_GIGS,
            BandPermission.VIEW_ANALYTICS,
          ],
        },
      ],
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    const docRef = await addDocument(BANDS_COLLECTION, newBand);

    // Update creator's bands array
    await updateDocument("users", creatorId, {
      bands: arrayUnion(docRef.id),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating band:", error);
    throw error;
  }
};

// Get band by ID
export const getBandById = async (bandId: string): Promise<IBand | null> => {
  try {
    return await getDocumentById<IBand>(BANDS_COLLECTION, bandId);
  } catch (error) {
    console.error("Error getting band:", error);
    throw error;
  }
};

// Get bands for a user
export const getUserBands = async (userId: string): Promise<IBand[]> => {
  try {
    // Get all active bands and filter client-side since array-contains with objects is complex
    const allBands = await queryDocuments<IBand>(BANDS_COLLECTION, [
      { field: "isActive", operator: "==", value: true }
    ]);
    
    // Filter to only bands where user is active member
    return allBands.filter(band => 
      band.members.some(member => member.userId === userId && member.isActive)
    );
  } catch (error) {
    console.error("Error getting user bands:", error);
    throw error;
  }
};

// Update band profile
export const updateBandProfile = async (
  bandId: string,
  updates: Partial<Pick<IBand, "name" | "bio" | "genres" | "location" | "profilePicture" | "socialLinks">>,
  userId: string
): Promise<void> => {
  try {
    // Check if user has permission
    const band = await getBandById(bandId);
    if (!band || !hasPermission(band, userId, BandPermission.MANAGE_PROFILE)) {
      throw new Error("Insufficient permissions to update band profile");
    }

    // Clean updates to remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await updateDocument(BANDS_COLLECTION, bandId, {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating band profile:", error);
    throw error;
  }
};

// Send band invitation
export const sendBandInvitation = async (
  bandId: string,
  invitedUserId: string,
  invitedBy: string,
  role: BandMemberRole,
  instruments: string[],
  message?: string
): Promise<string> => {
  try {
    // Check if inviter has permission
    const band = await getBandById(bandId);
    if (!band || !hasPermission(band, invitedBy, BandPermission.MANAGE_MEMBERS)) {
      throw new Error("Insufficient permissions to invite members");
    }

    // Check if user is already a member
    if (band.members.some(member => member.userId === invitedUserId && member.isActive)) {
      throw new Error("User is already a member of this band");
    }

    // Check for existing pending invitation
    const existingInvitations = await queryDocuments<IBandInvitation>(INVITATIONS_COLLECTION, [
      { field: "bandId", operator: "==", value: bandId },
      { field: "invitedUserId", operator: "==", value: invitedUserId },
      { field: "status", operator: "==", value: InvitationStatus.PENDING }
    ]);

    if (existingInvitations.length > 0) {
      throw new Error("User already has a pending invitation to this band");
    }

    // Create invitation
    const currentTime = new Date();
    const invitation: Omit<IBandInvitation, "id"> = {
      bandId,
      bandName: band.name,
      invitedUserId,
      invitedBy,
      role,
      instruments,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: currentTime,
      ...(message && { message }), // Only include message if it exists
    };

    const docRef = await addDocument(INVITATIONS_COLLECTION, invitation);

    // Add invitation to user's pending invitations
    await updateDocument("users", invitedUserId, {
      bandInvitations: arrayUnion(docRef.id),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error sending band invitation:", error);
    throw error;
  }
};

// Accept band invitation
export const acceptBandInvitation = async (invitationId: string): Promise<void> => {
  try {
    const invitation = await getDocumentById<IBandInvitation>(INVITATIONS_COLLECTION, invitationId);
    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new Error("Invalid or expired invitation");
    }

    const band = await getBandById(invitation.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Add user to band members
    const currentTime = new Date();
    const newMember: IBandMember = {
      userId: invitation.invitedUserId,
      role: invitation.role,
      instruments: invitation.instruments,
      joinedAt: currentTime as any,
      isActive: true,
      permissions: getDefaultPermissions(invitation.role),
    };

    await updateDocument(BANDS_COLLECTION, invitation.bandId, {
      members: arrayUnion(newMember),
      updatedAt: serverTimestamp(),
    });

    // Update user's bands array
    await updateDocument("users", invitation.invitedUserId, {
      bands: arrayUnion(invitation.bandId),
      bandInvitations: arrayRemove(invitationId),
    });

    // Update invitation status
    await updateDocument(INVITATIONS_COLLECTION, invitationId, {
      status: InvitationStatus.ACCEPTED,
    });
  } catch (error) {
    console.error("Error accepting band invitation:", error);
    throw error;
  }
};

// Decline band invitation
export const declineBandInvitation = async (invitationId: string): Promise<void> => {
  try {
    const invitation = await getDocumentById<IBandInvitation>(INVITATIONS_COLLECTION, invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Update invitation status
    await updateDocument(INVITATIONS_COLLECTION, invitationId, {
      status: InvitationStatus.DECLINED,
    });

    // Remove from user's pending invitations
    await updateDocument("users", invitation.invitedUserId, {
      bandInvitations: arrayRemove(invitationId),
    });
  } catch (error) {
    console.error("Error declining band invitation:", error);
    throw error;
  }
};

// Get user's pending invitations
export const getUserInvitations = async (userId: string): Promise<IBandInvitation[]> => {
  try {
    return await queryDocuments<IBandInvitation>(INVITATIONS_COLLECTION, [
      { field: "invitedUserId", operator: "==", value: userId },
      { field: "status", operator: "==", value: InvitationStatus.PENDING }
    ]);
  } catch (error) {
    console.error("Error getting user invitations:", error);
    throw error;
  }
};

// Remove member from band
export const removeBandMember = async (
  bandId: string,
  memberUserId: string,
  removedBy: string
): Promise<void> => {
  try {
    const band = await getBandById(bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Check permissions
    if (!hasPermission(band, removedBy, BandPermission.MANAGE_MEMBERS)) {
      throw new Error("Insufficient permissions to remove members");
    }

    // Can't remove the last leader
    const leaders = band.members.filter(m => m.role === BandMemberRole.LEADER && m.isActive);
    const memberToRemove = band.members.find(m => m.userId === memberUserId);
    
    if (memberToRemove?.role === BandMemberRole.LEADER && leaders.length === 1) {
      throw new Error("Cannot remove the last leader of the band");
    }

    // Update member status to inactive
    const updatedMembers = band.members.map(member =>
      member.userId === memberUserId
        ? { ...member, isActive: false }
        : member
    );

    await updateDocument(BANDS_COLLECTION, bandId, {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });

    // Remove band from user's bands array
    await updateDocument("users", memberUserId, {
      bands: arrayRemove(bandId),
    });
  } catch (error) {
    console.error("Error removing band member:", error);
    throw error;
  }
};

// Helper function to check permissions
export const hasPermission = (
  band: IBand,
  userId: string,
  permission: BandPermission
): boolean => {
  const member = band.members.find(m => m.userId === userId && m.isActive);
  if (!member) return false;
  
  // Leaders have all permissions
  if (member.role === BandMemberRole.LEADER) return true;
  
  return member.permissions.includes(permission);
};

// Helper function to get default permissions for a role
export const getDefaultPermissions = (role: BandMemberRole): BandPermission[] => {
  switch (role) {
    case BandMemberRole.LEADER:
      return [
        BandPermission.MANAGE_MEMBERS,
        BandPermission.MANAGE_VIDEOS,
        BandPermission.MANAGE_PROFILE,
        BandPermission.MANAGE_GIGS,
        BandPermission.VIEW_ANALYTICS,
      ];
    case BandMemberRole.ADMIN:
      return [
        BandPermission.MANAGE_MEMBERS,
        BandPermission.MANAGE_VIDEOS,
        BandPermission.MANAGE_PROFILE,
        BandPermission.VIEW_ANALYTICS,
      ];
    case BandMemberRole.MEMBER:
      return [BandPermission.MANAGE_VIDEOS];
    case BandMemberRole.GUEST:
      return [];
    default:
      return [];
  }
};

// Search bands
export const searchBands = async (
  searchTerm: string,
  genres?: string[],
  limitTo: number = 20
): Promise<IBand[]> => {
  try {
    let bands = await queryDocuments<IBand>(BANDS_COLLECTION, [
      { field: "isActive", operator: "==", value: true }
    ], undefined, limitTo * 2); // Get more to filter

    // Filter by search term (name or bio)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      bands = bands.filter(band =>
        band.name.toLowerCase().includes(term) ||
        band.bio?.toLowerCase().includes(term)
      );
    }

    // Filter by genres
    if (genres && genres.length > 0) {
      bands = bands.filter(band =>
        genres.some(genre => band.genres.includes(genre))
      );
    }

    return bands.slice(0, limitTo);
  } catch (error) {
    console.error("Error searching bands:", error);
    throw error;
  }
};

// ===== BAND APPLICATION FUNCTIONS =====

// Apply to join a band
export const applyToBand = async (
  bandId: string,
  applicantUserId: string,
  role: BandMemberRole,
  instruments: string[],
  message?: string
): Promise<string> => {
  try {
    const band = await getBandById(bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Check if user is already a member
    if (band.members.some(member => member.userId === applicantUserId && member.isActive)) {
      throw new Error("You are already a member of this band");
    }

    // Check for existing pending application
    const existingApplications = await queryDocuments<IBandApplication>(APPLICATIONS_COLLECTION, [
      { field: "bandId", operator: "==", value: bandId },
      { field: "applicantUserId", operator: "==", value: applicantUserId },
      { field: "status", operator: "==", value: ApplicationStatus.PENDING }
    ]);

    if (existingApplications.length > 0) {
      throw new Error("You already have a pending application to this band");
    }

    // Get applicant details
    const applicant = await getDocumentById<IUser>("users", applicantUserId);
    if (!applicant) {
      throw new Error("Applicant not found");
    }

    const applicantName = applicant.profile.firstName && applicant.profile.lastName
      ? `${applicant.profile.firstName} ${applicant.profile.lastName}`
      : applicant.profile.username;

    // Create application
    const currentTime = new Date();
    const application: Omit<IBandApplication, "id"> = {
      bandId,
      bandName: band.name,
      applicantUserId,
      applicantName,
      role,
      instruments,
      status: ApplicationStatus.PENDING,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      createdAt: currentTime,
      ...(message && { message }), // Only include message if it exists
    };

    const docRef = await addDocument(APPLICATIONS_COLLECTION, application);
    return docRef.id;
  } catch (error) {
    console.error("Error applying to band:", error);
    throw error;
  }
};

// Get applications for a band (for band managers)
export const getBandApplications = async (bandId: string): Promise<IBandApplication[]> => {
  try {
    return await queryDocuments<IBandApplication>(APPLICATIONS_COLLECTION, [
      { field: "bandId", operator: "==", value: bandId },
      { field: "status", operator: "==", value: ApplicationStatus.PENDING }
    ]);
  } catch (error) {
    console.error("Error getting band applications:", error);
    throw error;
  }
};

// Get user's applications (for users to track their applications)
export const getUserApplications = async (userId: string): Promise<IBandApplication[]> => {
  try {
    return await queryDocuments<IBandApplication>(APPLICATIONS_COLLECTION, [
      { field: "applicantUserId", operator: "==", value: userId },
      { field: "status", operator: "==", value: ApplicationStatus.PENDING }
    ]);
  } catch (error) {
    console.error("Error getting user applications:", error);
    throw error;
  }
};

// Accept band application
export const acceptBandApplication = async (
  applicationId: string,
  acceptedBy: string
): Promise<void> => {
  try {
    const application = await getDocumentById<IBandApplication>(APPLICATIONS_COLLECTION, applicationId);
    if (!application || application.status !== ApplicationStatus.PENDING) {
      throw new Error("Invalid or expired application");
    }

    const band = await getBandById(application.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Check permissions
    if (!hasPermission(band, acceptedBy, BandPermission.MANAGE_MEMBERS)) {
      throw new Error("Insufficient permissions to accept applications");
    }

    // Add user to band members
    const currentTime = new Date();
    const newMember: IBandMember = {
      userId: application.applicantUserId,
      role: application.role,
      instruments: application.instruments,
      joinedAt: currentTime as any,
      isActive: true,
      permissions: getDefaultPermissions(application.role),
    };

    await updateDocument(BANDS_COLLECTION, application.bandId, {
      members: arrayUnion(newMember),
      updatedAt: serverTimestamp(),
    });

    // Update user's bands array
    await updateDocument("users", application.applicantUserId, {
      bands: arrayUnion(application.bandId),
    });

    // Update application status
    await updateDocument(APPLICATIONS_COLLECTION, applicationId, {
      status: ApplicationStatus.ACCEPTED,
    });
  } catch (error) {
    console.error("Error accepting band application:", error);
    throw error;
  }
};

// Decline band application
export const declineBandApplication = async (
  applicationId: string,
  declinedBy: string
): Promise<void> => {
  try {
    const application = await getDocumentById<IBandApplication>(APPLICATIONS_COLLECTION, applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const band = await getBandById(application.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Check permissions
    if (!hasPermission(band, declinedBy, BandPermission.MANAGE_MEMBERS)) {
      throw new Error("Insufficient permissions to decline applications");
    }

    // Update application status
    await updateDocument(APPLICATIONS_COLLECTION, applicationId, {
      status: ApplicationStatus.DECLINED,
    });
  } catch (error) {
    console.error("Error declining band application:", error);
    throw error;
  }
};
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import {
  IGig,
  IGigApplication,
  GigStatus,
  GigType,
  AgeRestriction,
  GigApplicationStatus,
  Genres,
} from "@/lib/types";
import { VenueType } from "@/lib/types/venue";
import { createGigConversation } from "./messages";
import { getDocumentById } from "./firestore";

// Collection references
const GIGS_COLLECTION = "gigs";
const GIG_APPLICATIONS_COLLECTION = "gigApplications";

// Gig CRUD operations
export const createGig = async (
  gigData: Omit<IGig, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const docRef = await addDoc(collection(db, GIGS_COLLECTION), {
      ...gigData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating gig:", error);
    throw error;
  }
};

export const getGig = async (gigId: string): Promise<IGig | null> => {
  try {
    const docRef = doc(db, GIGS_COLLECTION, gigId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        // Convert Firestore Timestamp to Date
        date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
      } as IGig;
    }
    return null;
  } catch (error) {
    console.error("Error getting gig:", error);
    throw error;
  }
};

export const updateGig = async (gigId: string, updates: Partial<IGig>) => {
  try {
    const docRef = doc(db, GIGS_COLLECTION, gigId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating gig:", error);
    throw error;
  }
};

export const deleteGig = async (gigId: string) => {
  try {
    const docRef = doc(db, GIGS_COLLECTION, gigId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting gig:", error);
    throw error;
  }
};

// Get gigs with various filters
export const getGigs = async (
  options: {
    status?: GigStatus;
    venueId?: string;
    limit?: number;
    orderByField?: keyof IGig;
  } = {}
): Promise<IGig[]> => {
  try {
    const constraints = [];

    if (options.status) {
      constraints.push(where("status", "==", options.status));
    }

    if (options.venueId) {
      constraints.push(where("venueId", "==", options.venueId));
    }

    // Default ordering by date
    const orderField = options.orderByField || "date";
    constraints.push(orderBy(orderField, "asc"));

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const querySnapshot = await getDocs(
      query(collection(db, GIGS_COLLECTION), ...constraints)
    );

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to Date
      date:
        doc.data().date instanceof Timestamp
          ? doc.data().date.toDate()
          : doc.data().date,
    })) as IGig[];
  } catch (error) {
    console.error("Error getting gigs:", error);
    throw error;
  }
};

// Get upcoming gigs (published and in the future)
export const getUpcomingGigs = async (
  limitCount: number = 20
): Promise<IGig[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("🔍 Getting upcoming gigs for date:", today);

    // Try the optimized query first
    try {
      const q = query(
        collection(db, GIGS_COLLECTION),
        where("status", "==", GigStatus.PUBLISHED),
        where("date", ">=", today),
        orderBy("date", "asc"),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      console.log("🔍 Query returned", querySnapshot.docs.length, "gigs");

      const allGigs = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("🔍 Gig data:", { id: doc.id, title: data.title, date: data.date, status: data.status });
        return {
          id: doc.id,
          ...data,
          date:
            data.date instanceof Timestamp
              ? data.date.toDate()
              : data.date,
        };
      }) as IGig[];

      console.log("🔍 Processed gigs:", allGigs.length);
      return allGigs;

    } catch (indexError) {
      console.warn(
        "Index not ready, falling back to simple query:",
        indexError
      );

      // Fallback: get all published gigs and filter/sort in memory
      const q = query(
        collection(db, GIGS_COLLECTION),
        where("status", "==", GigStatus.PUBLISHED),
        limit(limitCount * 2)
      );

      const querySnapshot = await getDocs(q);
      const allGigs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date:
          doc.data().date instanceof Timestamp
            ? doc.data().date.toDate()
            : doc.data().date,
      })) as IGig[];

      // Filter by date and sort
      const futureGigs = allGigs
        .filter((gig) => gig.date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, limitCount);

      return futureGigs;
    }
  } catch (error) {
    console.error("Error getting upcoming gigs:", error);
    throw error;
  }
};

// Gig Application operations
export const createGigApplication = async (
  applicationData: Omit<IGigApplication, "id" | "appliedAt">
) => {
  try {
    // Filter out undefined values
    const cleanedData: any = {
      gigId: applicationData.gigId,
      applicantId: applicationData.applicantId,
      applicantType: applicationData.applicantType,
      applicantName: applicationData.applicantName,
      status: applicationData.status,
      appliedAt: serverTimestamp(),
    };

    // Only add message if it exists
    if (applicationData.message && applicationData.message.trim()) {
      cleanedData.message = applicationData.message.trim();
    }

    const docRef = await addDoc(
      collection(db, GIG_APPLICATIONS_COLLECTION),
      cleanedData
    );
    return docRef.id;
  } catch (error) {
    console.error("Error creating gig application:", error);
    throw error;
  }
};

export const getGigApplications = async (
  gigId: string
): Promise<IGigApplication[]> => {
  try {
    const q = query(
      collection(db, GIG_APPLICATIONS_COLLECTION),
      where("gigId", "==", gigId),
      orderBy("appliedAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to Date
        appliedAt: data.appliedAt instanceof Timestamp ? data.appliedAt.toDate() : data.appliedAt,
        respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toDate() : data.respondedAt,
      };
    }) as IGigApplication[];
  } catch (error) {
    console.error("Error getting gig applications:", error);
    throw error;
  }
};

export const updateGigApplication = async (
  applicationId: string,
  updates: Partial<IGigApplication>
) => {
  try {
    const docRef = doc(db, GIG_APPLICATIONS_COLLECTION, applicationId);
    const updateData = { ...updates };

    // Add respondedAt timestamp if status is being updated
    if (updates.status && updates.status !== GigApplicationStatus.PENDING) {
      (updateData as any).respondedAt = serverTimestamp();
    }

    await updateDoc(docRef, updateData);

    // Create conversation when application is accepted
    if (updates.status === GigApplicationStatus.ACCEPTED) {
      // Get the application data to create conversation
      const applicationDoc = await getDoc(docRef);
      if (applicationDoc.exists()) {
        const applicationData = applicationDoc.data() as IGigApplication;
        
        // Get gig data
        const gigData = await getGig(applicationData.gigId);
        if (gigData) {
          // Get venue manager data
          const venueManagerData = await getDocumentById("users", gigData.createdBy);
          
          if (venueManagerData && 'profile' in venueManagerData) {
            const venueManager = venueManagerData as any;
            await createGigConversation({
              gigId: gigData.id,
              gigTitle: gigData.title,
              venueManagerId: gigData.createdBy,
              venueManagerName: venueManager.profile.firstName && venueManager.profile.lastName 
                ? `${venueManager.profile.firstName} ${venueManager.profile.lastName}`
                : venueManager.profile.username,
              artistId: applicationData.applicantId,
              artistName: applicationData.applicantName,
              artistType: applicationData.applicantType,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error updating gig application:", error);
    throw error;
  }
};

// Get applications by user (musician or band)
export const getUserGigApplications = async (
  userId: string
): Promise<IGigApplication[]> => {
  try {
    const q = query(
      collection(db, GIG_APPLICATIONS_COLLECTION),
      where("applicantId", "==", userId),
      orderBy("appliedAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to Date
        appliedAt: data.appliedAt instanceof Timestamp ? data.appliedAt.toDate() : data.appliedAt,
        respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toDate() : data.respondedAt,
      };
    }) as IGigApplication[];
  } catch (error) {
    console.error("Error getting user gig applications:", error);
    throw error;
  }
};

// Get accepted gigs for a musician or band
export const getAcceptedGigs = async (
  applicantId: string
): Promise<IGig[]> => {
  try {
    // First, get all accepted applications for this applicant
    const q = query(
      collection(db, GIG_APPLICATIONS_COLLECTION),
      where("applicantId", "==", applicantId),
      where("status", "==", GigApplicationStatus.ACCEPTED),
      orderBy("appliedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const acceptedApplications = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to Date
        appliedAt: data.appliedAt instanceof Timestamp ? data.appliedAt.toDate() : data.appliedAt,
        respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toDate() : data.respondedAt,
      };
    }) as IGigApplication[];

    // Get the gig details for each accepted application
    const gigPromises = acceptedApplications.map(async (application) => {
      const gigData = await getGig(application.gigId);
      return gigData;
    });

    const gigs = await Promise.all(gigPromises);
    
    // Filter out null values and sort by date
    return gigs
      .filter((gig): gig is IGig => gig !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error("Error getting accepted gigs:", error);
    throw error;
  }
};

// Get upcoming accepted gigs for a musician or band
export const getUpcomingAcceptedGigs = async (
  applicantId: string
): Promise<IGig[]> => {
  try {
    const allAcceptedGigs = await getAcceptedGigs(applicantId);
    const now = new Date();
    
    // Filter to only upcoming gigs (gigs in the future)
    return allAcceptedGigs
      .filter(gig => gig.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error("Error getting upcoming accepted gigs:", error);
    throw error;
  }
};

// Get past accepted gigs for a musician or band
export const getPastAcceptedGigs = async (
  applicantId: string
): Promise<IGig[]> => {
  try {
    const allAcceptedGigs = await getAcceptedGigs(applicantId);
    const now = new Date();
    
    // Filter to only past gigs (gigs that have already occurred)
    return allAcceptedGigs
      .filter(gig => gig.date < now)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort descending for past gigs
  } catch (error) {
    console.error("Error getting past accepted gigs:", error);
    throw error;
  }
};

// Check if a gig has any accepted applications
export const gigHasAcceptedApplications = async (gigId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, GIG_APPLICATIONS_COLLECTION),
      where("gigId", "==", gigId),
      where("status", "==", GigApplicationStatus.ACCEPTED),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking gig accepted applications:", error);
    return false;
  }
};

// Get available gigs (published, upcoming, and without accepted applications)
export const getAvailableGigs = async (limitCount: number = 20): Promise<IGig[]> => {
  try {
    // First get all upcoming gigs
    const upcomingGigs = await getUpcomingGigs(limitCount * 2); // Get more to account for filtering
    
    // Filter out gigs that already have accepted applications
    const availableGigs: IGig[] = [];
    
    for (const gig of upcomingGigs) {
      const hasAcceptedApps = await gigHasAcceptedApplications(gig.id);
      if (!hasAcceptedApps) {
        availableGigs.push(gig);
        if (availableGigs.length >= limitCount) {
          break;
        }
      }
    }
    
    return availableGigs;
  } catch (error) {
    console.error("Error getting available gigs:", error);
    throw error;
  }
};

// Simple wrapper to apply to a gig (for musicians)
export const applyToGig = async (gigId: string, userId: string, message?: string) => {
  try {
    // Get user data to determine applicant type and name
    const userData = await getDocumentById("users", userId);
    if (!userData || !('profile' in userData)) {
      throw new Error("User not found");
    }

    const user = userData as any;
    const profile = user.profile;
    
    let applicantName = "";
    let applicantType: "musician" | "band" = "musician";

    if (profile.firstName && profile.lastName) {
      applicantName = `${profile.firstName} ${profile.lastName}`;
    } else if (profile.username) {
      applicantName = profile.username;
    } else {
      applicantName = "Unknown";
    }

    // For now, assuming individual musician applications
    // In the future, this could be extended to handle band applications
    applicantType = "musician";

    const applicationData = {
      gigId,
      applicantId: userId,
      applicantType,
      applicantName,
      status: GigApplicationStatus.PENDING,
      message: message || "",
    };

    return await createGigApplication(applicationData);
  } catch (error) {
    console.error("Error applying to gig:", error);
    throw error;
  }
};

// Enhanced gig search with advanced filtering
export interface GigSearchFilters {
  // Basic filters
  status?: GigStatus;
  venueId?: string;
  createdBy?: string;
  
  // Date filters
  dateFrom?: Date;
  dateTo?: Date;
  
  // Location filters
  location?: string;
  radius?: number; // in kilometers
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Genre and type filters
  genres?: Genres[];
  gigType?: GigType;
  
  // Payment filters
  paymentMin?: number;
  paymentMax?: number;
  paymentCurrency?: string;
  paidGigsOnly?: boolean;
  
  // Venue filters
  venueType?: VenueType;
  capacity?: {
    min?: number;
    max?: number;
  };
  amenities?: string[];
  
  // Application filters
  hasOpenApplications?: boolean;
  applicationDeadlineAfter?: Date;
  maxApplicants?: number;
  
  // Technical requirements
  requiresSoundSystem?: boolean;
  requiresLighting?: boolean;
  backlineRequired?: string[];
  
  // Audience filters
  ageRestriction?: AgeRestriction;
  expectedAttendanceMin?: number;
  expectedAttendanceMax?: number;
  
  // Sorting
  sortBy?: 'date' | 'created' | 'payment' | 'distance' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
}

// Advanced gig search function
export const searchGigs = async (filters: GigSearchFilters): Promise<{
  gigs: IGig[];
  total: number;
  hasMore: boolean;
}> => {
  try {
    const constraints = [];
    
    // Basic status filter (always include published gigs in search)
    if (filters.status) {
      constraints.push(where("status", "==", filters.status));
    } else {
      constraints.push(where("status", "==", GigStatus.PUBLISHED));
    }
    
    // Venue filter
    if (filters.venueId) {
      constraints.push(where("venueId", "==", filters.venueId));
    }
    
    // Creator filter
    if (filters.createdBy) {
      constraints.push(where("createdBy", "==", filters.createdBy));
    }
    
    // Date range filters
    if (filters.dateFrom) {
      constraints.push(where("date", ">=", filters.dateFrom));
    }
    if (filters.dateTo) {
      constraints.push(where("date", "<=", filters.dateTo));
    }
    
    // Genre filter (array-contains-any for multiple genres)
    if (filters.genres && filters.genres.length > 0) {
      if (filters.genres.length === 1) {
        constraints.push(where("genres", "array-contains", filters.genres[0]));
      } else {
        constraints.push(where("genres", "array-contains-any", filters.genres));
      }
    }
    
    // Gig type filter
    if (filters.gigType) {
      constraints.push(where("gigType", "==", filters.gigType));
    }
    
    // Payment filters
    if (filters.paymentMin !== undefined) {
      constraints.push(where("paymentAmount", ">=", filters.paymentMin));
    }
    if (filters.paymentMax !== undefined) {
      constraints.push(where("paymentAmount", "<=", filters.paymentMax));
    }
    if (filters.paidGigsOnly) {
      constraints.push(where("paymentAmount", ">", 0));
    }
    
    // Application deadline filter
    if (filters.applicationDeadlineAfter) {
      constraints.push(where("applicationDeadline", ">=", filters.applicationDeadlineAfter));
    }
    
    // Age restriction filter
    if (filters.ageRestriction) {
      constraints.push(where("ageRestriction", "==", filters.ageRestriction));
    }
    
    // Sorting
    const sortField = filters.sortBy || "date";
    const sortDirection = filters.sortOrder || "asc";
    constraints.push(orderBy(sortField, sortDirection));
    
    // Pagination
    const limitCount = filters.limit || 20;
    constraints.push(limit(limitCount + 1)); // Get one extra to check if there are more
    
    if (filters.offset) {
      // For pagination, we'd need to implement cursor-based pagination
      // This is a simplified version
    }
    
    const querySnapshot = await getDocs(
      query(collection(db, GIGS_COLLECTION), ...constraints)
    );
    
    const allGigs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : doc.data().date,
    })) as IGig[];
    
    // Check if there are more results
    const hasMore = allGigs.length > limitCount;
    const gigs = hasMore ? allGigs.slice(0, limitCount) : allGigs;
    
    // Apply client-side filters that can't be done in Firestore
    let filteredGigs = gigs;
    
    // Location-based filtering (requires client-side calculation)
    if (filters.coordinates && filters.radius) {
      filteredGigs = filteredGigs.filter(gig => {
        if (!gig.coordinates) return false;
        const distance = calculateDistance(
          filters.coordinates!.latitude,
          filters.coordinates!.longitude,
          gig.coordinates.latitude,
          gig.coordinates.longitude
        );
        return distance <= filters.radius!;
      });
    }
    
    // Expected attendance filters
    if (filters.expectedAttendanceMin !== undefined) {
      filteredGigs = filteredGigs.filter(gig => 
        gig.expectedAttendance && gig.expectedAttendance >= filters.expectedAttendanceMin!
      );
    }
    if (filters.expectedAttendanceMax !== undefined) {
      filteredGigs = filteredGigs.filter(gig => 
        gig.expectedAttendance && gig.expectedAttendance <= filters.expectedAttendanceMax!
      );
    }
    
    // Open applications filter
    if (filters.hasOpenApplications) {
      const now = new Date();
      filteredGigs = filteredGigs.filter(gig => {
        // Check if application deadline hasn't passed
        if (gig.applicationDeadline && gig.applicationDeadline < now) {
          return false;
        }
        // Check if max applicants reached
        if (gig.maxApplicants && gig.applications.length >= gig.maxApplicants) {
          return false;
        }
        return true;
      });
    }
    
    return {
      gigs: filteredGigs,
      total: filteredGigs.length,
      hasMore: hasMore && filteredGigs.length === limitCount
    };
    
  } catch (error) {
    console.error("Error searching gigs:", error);
    throw error;
  }
};

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Get gigs near a location
export const getGigsNearLocation = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 50,
  limit: number = 20
): Promise<IGig[]> => {
  return searchGigs({
    coordinates: { latitude, longitude },
    radius: radiusKm,
    limit,
    hasOpenApplications: true,
    sortBy: 'distance'
  }).then(result => result.gigs);
};

// Get popular gigs (by application count)
export const getPopularGigs = async (limit: number = 10): Promise<IGig[]> => {
  try {
    const gigs = await getGigs({ 
      status: GigStatus.PUBLISHED, 
      limit: limit * 2 // Get more to sort by popularity
    });
    
    // Sort by application count (popularity)
    return gigs
      .sort((a, b) => b.applications.length - a.applications.length)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting popular gigs:", error);
    throw error;
  }
};

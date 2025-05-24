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
  ApplicationStatus,
} from "@/lib/types";

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

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date:
          doc.data().date instanceof Timestamp
            ? doc.data().date.toDate()
            : doc.data().date,
      })) as IGig[];
    } catch (indexError) {
      console.warn(
        "Index not ready, falling back to simple query:",
        indexError
      );

      // Fallback: get all published gigs and filter/sort in memory
      const q = query(
        collection(db, GIGS_COLLECTION),
        where("status", "==", GigStatus.PUBLISHED),
        limit(limitCount * 2) // Get more to ensure we have enough after filtering
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

      // Filter and sort in memory
      return allGigs
        .filter((gig) => gig.date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, limitCount);
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

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IGigApplication[];
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
    if (updates.status && updates.status !== ApplicationStatus.PENDING) {
      (updateData as any).respondedAt = serverTimestamp();
    }

    await updateDoc(docRef, updateData);
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

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IGigApplication[];
  } catch (error) {
    console.error("Error getting user gig applications:", error);
    throw error;
  }
};

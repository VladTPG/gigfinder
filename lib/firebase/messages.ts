import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { 
  IGigMessage, 
  IGigConversation, 
  CreateGigConversationData, 
  CreateGigMessageData 
} from "@/lib/types/message";

const CONVERSATIONS_COLLECTION = "gigConversations";
const MESSAGES_COLLECTION = "gigMessages";

// Create a new conversation when an application is accepted
export const createGigConversation = async (
  conversationData: CreateGigConversationData
): Promise<string> => {
  try {
    // Check if conversation already exists
    const existingConversation = await getGigConversation(
      conversationData.gigId,
      conversationData.artistId
    );
    
    if (existingConversation) {
      return existingConversation.id;
    }

    const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
      ...conversationData,
      unreadCount: {
        venueManager: 0,
        artist: 0,
      },
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating gig conversation:", error);
    throw error;
  }
};

// Get a specific conversation
export const getGigConversation = async (
  gigId: string,
  artistId: string
): Promise<IGigConversation | null> => {
  try {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where("gigId", "==", gigId),
      where("artistId", "==", artistId)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as IGigConversation;
  } catch (error) {
    console.error("Error getting gig conversation:", error);
    throw error;
  }
};

// Get all conversations for a user (venue manager or artist)
export const getUserGigConversations = async (
  userId: string,
  userType: "venue_manager" | "artist"
): Promise<IGigConversation[]> => {
  try {
    const field = userType === "venue_manager" ? "venueManagerId" : "artistId";
    
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where(field, "==", userId),
      where("isActive", "==", true),
      orderBy("updatedAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IGigConversation[];
  } catch (error) {
    console.error("Error getting user gig conversations:", error);
    throw error;
  }
};

// Send a message in a conversation
export const sendGigMessage = async (
  conversationId: string,
  messageData: CreateGigMessageData
): Promise<string> => {
  try {
    // Add the message
    const messageDocRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      ...messageData,
      conversationId: conversationId,
      timestamp: serverTimestamp(),
      isRead: false,
    });

    // Update the conversation with last message info and increment unread count
    const recipientType = messageData.senderType === "venue_manager" ? "artist" : "venueManager";
    
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      lastMessage: messageData.message,
      lastMessageTimestamp: serverTimestamp(),
      lastMessageSenderId: messageData.senderId,
      [`unreadCount.${recipientType}`]: (await getConversationUnreadCount(conversationId, recipientType)) + 1,
      updatedAt: serverTimestamp(),
    });

    return messageDocRef.id;
  } catch (error) {
    console.error("Error sending gig message:", error);
    throw error;
  }
};

// Get messages for a conversation
export const getGigMessages = async (
  conversationId: string,
  limitCount: number = 50
): Promise<IGigMessage[]> => {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IGigMessage[];
  } catch (error) {
    console.error("Error getting gig messages:", error);
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    // Get unread messages for this user
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where("conversationId", "==", conversationId),
      where("recipientId", "==", userId),
      where("isRead", "==", false)
    );

    const querySnapshot = await getDocs(q);
    
    // Mark all messages as read
    const updatePromises = querySnapshot.docs.map((messageDoc) =>
      updateDoc(messageDoc.ref, { isRead: true })
    );

    await Promise.all(updatePromises);

    // Reset unread count in conversation
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (conversationDoc.exists()) {
      const conversationData = conversationDoc.data() as IGigConversation;
      const userType = conversationData.venueManagerId === userId ? "venueManager" : "artist";
      
      await updateDoc(conversationRef, {
        [`unreadCount.${userType}`]: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

// Get unread count for a conversation
const getConversationUnreadCount = async (
  conversationId: string,
  userType: "venueManager" | "artist"
): Promise<number> => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (conversationDoc.exists()) {
      const data = conversationDoc.data() as IGigConversation;
      return data.unreadCount[userType] || 0;
    }
    
    return 0;
  } catch (error) {
    console.error("Error getting conversation unread count:", error);
    return 0;
  }
};

// Real-time listener for messages in a conversation
export const subscribeToGigMessages = (
  conversationId: string,
  callback: (messages: IGigMessage[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("conversationId", "==", conversationId),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IGigMessage[];
    
    callback(messages);
  });
};

// Real-time listener for user conversations
export const subscribeToUserGigConversations = (
  userId: string,
  userType: "venue_manager" | "artist",
  callback: (conversations: IGigConversation[]) => void
): Unsubscribe => {
  const field = userType === "venue_manager" ? "venueManagerId" : "artistId";
  
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where(field, "==", userId),
    where("isActive", "==", true),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const conversations = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IGigConversation[];
    
    callback(conversations);
  });
};

// Get total unread message count for a user
export const getTotalUnreadCount = async (
  userId: string,
  userType: "venue_manager" | "artist"
): Promise<number> => {
  try {
    const conversations = await getUserGigConversations(userId, userType);
    const totalUnread = conversations.reduce((total, conversation) => {
      const unreadCount = userType === "venue_manager" 
        ? conversation.unreadCount.venueManager 
        : conversation.unreadCount.artist;
      return total + unreadCount;
    }, 0);
    
    return totalUnread;
  } catch (error) {
    console.error("Error getting total unread count:", error);
    return 0;
  }
};

// Real-time listener for total unread count
export const subscribeToTotalUnreadCount = (
  userId: string,
  userType: "venue_manager" | "artist",
  callback: (count: number) => void
): Unsubscribe => {
  return subscribeToUserGigConversations(userId, userType, (conversations) => {
    const totalUnread = conversations.reduce((total, conversation) => {
      const unreadCount = userType === "venue_manager" 
        ? conversation.unreadCount.venueManager 
        : conversation.unreadCount.artist;
      return total + unreadCount;
    }, 0);
    
    callback(totalUnread);
  });
};

// Create conversations for existing accepted applications (migration utility)
export const createConversationsForExistingAcceptedApplications = async (): Promise<void> => {
  try {
    const { getGigApplications, getGig } = await import("./gigs");
    const { getDocumentById } = await import("./firestore");
    
    // Get all accepted applications
    const q = query(
      collection(db, "gigApplications"),
      where("status", "==", "accepted")
    );

    const querySnapshot = await getDocs(q);
    const acceptedApplications = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    console.log(`Found ${acceptedApplications.length} accepted applications`);

    for (const application of acceptedApplications) {
      try {
        // Check if conversation already exists
        const existingConversation = await getGigConversation(
          application.gigId,
          application.applicantId
        );

        if (existingConversation) {
          console.log(`Conversation already exists for gig ${application.gigId} and artist ${application.applicantId}`);
          continue;
        }

        // Get gig data
        const gigData = await getGig(application.gigId);
        if (!gigData) {
          console.log(`Gig not found: ${application.gigId}`);
          continue;
        }

        // Get venue manager data
        const venueManagerData = await getDocumentById("users", gigData.createdBy);
        if (!venueManagerData || !('profile' in venueManagerData)) {
          console.log(`Venue manager not found: ${gigData.createdBy}`);
          continue;
        }

        const venueManager = venueManagerData as any;
        const conversationId = await createGigConversation({
          gigId: gigData.id,
          gigTitle: gigData.title,
          venueManagerId: gigData.createdBy,
          venueManagerName: venueManager.profile.firstName && venueManager.profile.lastName 
            ? `${venueManager.profile.firstName} ${venueManager.profile.lastName}`
            : venueManager.profile.username,
          artistId: application.applicantId,
          artistName: application.applicantName,
          artistType: application.applicantType,
        });

        console.log(`Created conversation ${conversationId} for gig ${gigData.title}`);
      } catch (error) {
        console.error(`Error creating conversation for application ${application.id}:`, error);
      }
    }

    console.log("Finished creating conversations for existing accepted applications");
  } catch (error) {
    console.error("Error in createConversationsForExistingAcceptedApplications:", error);
    throw error;
  }
};

// Create conversation for a specific accepted application (helper function)
export const createConversationForAcceptedApplication = async (
  gigId: string,
  artistId: string
): Promise<string | null> => {
  try {
    const { getGig } = await import("./gigs");
    const { getDocumentById } = await import("./firestore");
    
    // Check if conversation already exists
    const existingConversation = await getGigConversation(gigId, artistId);
    if (existingConversation) {
      return existingConversation.id;
    }

    // Get the accepted application
    const q = query(
      collection(db, "gigApplications"),
      where("gigId", "==", gigId),
      where("applicantId", "==", artistId),
      where("status", "==", "accepted"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log("No accepted application found for this gig and artist");
      return null;
    }

    const application = querySnapshot.docs[0].data() as any;

    // Get gig data
    const gigData = await getGig(gigId);
    if (!gigData) {
      console.log(`Gig not found: ${gigId}`);
      return null;
    }

    // Get venue manager data
    const venueManagerData = await getDocumentById("users", gigData.createdBy);
    if (!venueManagerData || !('profile' in venueManagerData)) {
      console.log(`Venue manager not found: ${gigData.createdBy}`);
      return null;
    }

    const venueManager = venueManagerData as any;
    const conversationId = await createGigConversation({
      gigId: gigData.id,
      gigTitle: gigData.title,
      venueManagerId: gigData.createdBy,
      venueManagerName: venueManager.profile.firstName && venueManager.profile.lastName 
        ? `${venueManager.profile.firstName} ${venueManager.profile.lastName}`
        : venueManager.profile.username,
      artistId: application.applicantId,
      artistName: application.applicantName,
      artistType: application.applicantType,
    });

    console.log(`Created conversation ${conversationId} for existing accepted application`);
    return conversationId;
  } catch (error) {
    console.error("Error creating conversation for accepted application:", error);
    return null;
  }
}; 
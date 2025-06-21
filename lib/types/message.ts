import { serverTimestamp } from "firebase/firestore";

export interface IGigMessage {
  id: string; // Firestore document ID
  conversationId: string; // Reference to the conversation
  gigId: string; // Reference to the gig
  senderId: string; // User ID of sender (venue manager or artist)
  senderName: string; // Display name of sender
  senderType: "venue_manager" | "artist"; // Type of sender
  recipientId: string; // User ID of recipient
  recipientName: string; // Display name of recipient
  message: string; // Message content
  timestamp: typeof serverTimestamp;
  isRead: boolean; // Whether the message has been read
  messageType?: "text" | "system"; // Type of message (system for automated messages)
}

export interface IGigConversation {
  id: string; // Firestore document ID
  gigId: string; // Reference to the gig
  gigTitle: string; // Denormalized gig title for easy display
  venueManagerId: string; // Venue manager user ID
  venueManagerName: string; // Venue manager display name
  artistId: string; // Artist (musician or band) ID
  artistName: string; // Artist display name
  artistType: "musician" | "band"; // Type of artist
  lastMessage?: string; // Last message content for preview
  lastMessageTimestamp?: typeof serverTimestamp; // Timestamp of last message
  lastMessageSenderId?: string; // ID of who sent the last message
  unreadCount: {
    venueManager: number; // Unread count for venue manager
    artist: number; // Unread count for artist
  };
  isActive: boolean; // Whether the conversation is active
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}

// For creating a new conversation
export type CreateGigConversationData = Omit<IGigConversation, "id" | "createdAt" | "updatedAt" | "lastMessage" | "lastMessageTimestamp" | "lastMessageSenderId" | "unreadCount" | "isActive">;

// For creating a new message
export type CreateGigMessageData = Omit<IGigMessage, "id" | "conversationId" | "timestamp" | "isRead">; 
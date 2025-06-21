"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { 
  getUserGigConversations, 
  getGigMessages, 
  sendGigMessage, 
  markMessagesAsRead,
  subscribeToGigMessages,
  subscribeToUserGigConversations,
  createConversationForAcceptedApplication,
  createConversationsForExistingAcceptedApplications
} from "@/lib/firebase/messages";
import { IGigConversation, IGigMessage } from "@/lib/types/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, ArrowLeft, Calendar, User, Music } from "lucide-react";
import Link from "next/link";

interface GigMessagesProps {
  gigId?: string;
  artistId?: string;
}

export default function GigMessages({ gigId, artistId }: GigMessagesProps) {
  const { userProfile } = useAuth();
  const [conversations, setConversations] = useState<IGigConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<IGigConversation | null>(null);
  const [messages, setMessages] = useState<IGigMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userType = userProfile?.role === "manager" ? "venue_manager" : "artist";

  useEffect(() => {
    if (!userProfile) return;

    const loadConversations = async () => {
      try {
        let userConversations = await getUserGigConversations(userProfile.id, userType);
        
        // If gigId and artistId are provided, try to find that conversation
        if (gigId && artistId) {
          let targetConversation = userConversations.find(
            conv => conv.gigId === gigId && 
            (userType === "venue_manager" ? conv.artistId === artistId : conv.venueManagerId === artistId)
          );
          
          // If conversation doesn't exist, try to create it for existing accepted applications
          if (!targetConversation) {
            console.log("Conversation not found, attempting to create for existing accepted application");
            const conversationId = await createConversationForAcceptedApplication(gigId, artistId);
            
            if (conversationId) {
              // Reload conversations after creating the new one
              userConversations = await getUserGigConversations(userProfile.id, userType);
              targetConversation = userConversations.find(
                conv => conv.gigId === gigId && 
                (userType === "venue_manager" ? conv.artistId === artistId : conv.venueManagerId === artistId)
              );
            }
          }
          
          if (targetConversation) {
            setSelectedConversation(targetConversation);
          }
        }
        
        setConversations(userConversations);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();

    // Subscribe to real-time conversation updates
    const unsubscribe = subscribeToUserGigConversations(
      userProfile.id,
      userType,
      setConversations
    );

    return () => unsubscribe();
  }, [userProfile, gigId, artistId, userType]);

  useEffect(() => {
    if (!selectedConversation) return;

    // Subscribe to real-time messages for selected conversation
    console.log("Subscribing to messages for conversation:", selectedConversation.id);
    const unsubscribe = subscribeToGigMessages(
      selectedConversation.id,
      (newMessages) => {
        console.log("Received messages update:", newMessages.length, "messages");
        setMessages(newMessages);
        // Mark messages as read
        markMessagesAsRead(selectedConversation.id, userProfile!.id);
      }
    );

    return () => unsubscribe();
  }, [selectedConversation, userProfile]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userProfile || sending) return;

    setSending(true);
    try {
      const recipientId = userType === "venue_manager" 
        ? selectedConversation.artistId 
        : selectedConversation.venueManagerId;
      
      const recipientName = userType === "venue_manager" 
        ? selectedConversation.artistName 
        : selectedConversation.venueManagerName;

      const senderName = userProfile.profile.firstName && userProfile.profile.lastName
        ? `${userProfile.profile.firstName} ${userProfile.profile.lastName}`
        : userProfile.profile.username;

      console.log("Sending message to conversation:", selectedConversation.id);
      
      const messageId = await sendGigMessage(selectedConversation.id, {
        gigId: selectedConversation.gigId,
        senderId: userProfile.id,
        senderName,
        senderType: userType,
        recipientId,
        recipientName,
        message: newMessage.trim(),
        messageType: "text",
      });

      console.log("Message sent successfully:", messageId);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleMigrateConversations = async () => {
    setMigrating(true);
    try {
      await createConversationsForExistingAcceptedApplications();
      // Reload conversations after migration
      const userConversations = await getUserGigConversations(userProfile!.id, userType);
      setConversations(userConversations);
    } catch (error) {
      console.error("Error migrating conversations:", error);
    } finally {
      setMigrating(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-6" />
        <h3 className="text-xl font-medium text-gray-300 mb-3">No conversations yet</h3>
        <div className="text-gray-500 space-y-2 max-w-md mx-auto">
          {userType === "venue_manager" ? (
            <>
              <p className="mb-4">Conversations will appear here when you accept applications for your gigs.</p>
              <div className="bg-gray-700/30 rounded-lg p-4 text-sm">
                <h4 className="text-gray-300 font-medium mb-2">💡 How to start conversations:</h4>
                <ul className="text-left space-y-1">
                  <li>• Review applications on your gig pages</li>
                  <li>• Accept applications you're interested in</li>
                  <li>• Use the "Message" button to start chatting</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4">Conversations will appear here when your applications are accepted.</p>
              <div className="bg-gray-700/30 rounded-lg p-4 text-sm">
                <h4 className="text-gray-300 font-medium mb-2">💡 How to start conversations:</h4>
                <ul className="text-left space-y-1">
                  <li>• Apply to gigs you're interested in</li>
                  <li>• Wait for venue managers to accept your application</li>
                  <li>• Use the "Message Venue" button on accepted applications</li>
                </ul>
              </div>
            </>
          )}
          
          {/* Migration button for existing accepted applications */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <h4 className="text-blue-300 font-medium mb-2">🔄 Missing conversations?</h4>
            <p className="text-sm text-blue-200 mb-3">
              If you have accepted applications from before the messaging feature was added, 
              click below to create conversations for them.
            </p>
            <Button
              onClick={handleMigrateConversations}
              disabled={migrating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {migrating ? "Creating conversations..." : "Create missing conversations"}
            </Button>
          </div>
          
          <div className="mt-4">
            <Link href="/gigs" className="text-purple-400 hover:text-purple-300 text-sm underline">
              Browse available gigs →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[700px] bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Conversations List */}
      <div className={`w-80 border-r border-gray-700 flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <h2 className="text-lg font-semibold text-white">Messages</h2>
          <p className="text-sm text-gray-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => {
            const otherPartyName = userType === "venue_manager" 
              ? conversation.artistName 
              : conversation.venueManagerName;
            
            const unreadCount = userType === "venue_manager" 
              ? conversation.unreadCount.venueManager 
              : conversation.unreadCount.artist;

            const isSelected = selectedConversation?.id === conversation.id;

            return (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-700/30 ${
                  isSelected ? 'bg-gray-700/70 border-l-4 border-l-purple-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    {userType === "venue_manager" ? (
                      <Music className="h-6 w-6 text-white" />
                    ) : (
                      <Calendar className="h-6 w-6 text-white" />
                    )}
                  </div>
                  
                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-white truncate text-sm">
                        {conversation.gigTitle}
                      </h3>
                      {conversation.lastMessageTimestamp && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatLastMessageTime(conversation.lastMessageTimestamp)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-400 truncate mb-1">
                      {otherPartyName}
                    </p>
                    
                    {conversation.lastMessage && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 truncate flex-1">
                          {conversation.lastMessage}
                        </p>
                        {unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1 ml-2 flex-shrink-0">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="lg:hidden text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                {userType === "venue_manager" ? (
                  <Music className="h-5 w-5 text-white" />
                ) : (
                  <Calendar className="h-5 w-5 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">
                  {selectedConversation.gigTitle}
                </h3>
                <p className="text-sm text-gray-400">
                  with {userType === "venue_manager" 
                    ? selectedConversation.artistName 
                    : selectedConversation.venueManagerName
                  }
                </p>
              </div>
              
              <Link
                href={`/gigs/${selectedConversation.gigId}`}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                View Gig
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwnMessage = message.senderId === userProfile?.id;
                  const showDate = index === 0 || 
                    formatDate(message.timestamp) !== formatDate(messages[index - 1]?.timestamp);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-purple-600 text-white rounded-br-md'
                                : 'bg-gray-700 text-gray-100 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{message.message}</p>
                          </div>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-right text-purple-300' : 'text-left text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex items-center gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 rounded-full px-4"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-purple-600 hover:bg-purple-700 rounded-full w-10 h-10 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
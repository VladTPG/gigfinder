import { queryDocuments, getDocumentById, updateDocument } from "./firestore";
import { IUser } from "@/lib/types";
import { arrayUnion, arrayRemove } from "firebase/firestore";

const USERS_COLLECTION = "users";

// Search users by username, first name, or last name
export const searchUsers = async (searchTerm: string, limitTo: number = 20): Promise<IUser[]> => {
  try {
    if (!searchTerm.trim()) {
      return [];
    }

    // Get all users and filter client-side for now
    // In a production app, you'd want to use a search service like Algolia
    const allUsers = await queryDocuments<IUser>(USERS_COLLECTION, [], undefined, limitTo * 2);
    
    const term = searchTerm.toLowerCase();
    const filteredUsers = allUsers.filter(user => {
      const username = user.profile.username?.toLowerCase() || "";
      const firstName = user.profile.firstName?.toLowerCase() || "";
      const lastName = user.profile.lastName?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      return (
        username.includes(term) ||
        firstName.includes(term) ||
        lastName.includes(term) ||
        fullName.includes(term)
      );
    });

    return filteredUsers.slice(0, limitTo);
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<IUser | null> => {
  try {
    return await getDocumentById<IUser>(USERS_COLLECTION, userId);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
};

// Get multiple users by their IDs
export const getUsersByIds = async (userIds: string[]): Promise<IUser[]> => {
  try {
    if (userIds.length === 0) return [];
    
    // Fetch all users in parallel
    const userPromises = userIds.map(id => getUserById(id));
    const users = await Promise.all(userPromises);
    
    // Filter out null results (users that don't exist)
    return users.filter((user): user is IUser => user !== null);
  } catch (error) {
    console.error("Error getting users by IDs:", error);
    throw error;
  }
};

// Follow a user
export const followUser = async (followerId: string, targetUserId: string): Promise<void> => {
  try {
    if (followerId === targetUserId) {
      throw new Error("Cannot follow yourself");
    }

    // Check if already following
    const follower = await getUserById(followerId);
    if (!follower) {
      throw new Error("Follower user not found");
    }

    if (follower.following.includes(targetUserId)) {
      throw new Error("Already following this user");
    }

    // Check if target user exists
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Update both users atomically
    await Promise.all([
      // Add to follower's following list
      updateDocument(USERS_COLLECTION, followerId, {
        following: arrayUnion(targetUserId)
      }),
      // Add to target's followers list
      updateDocument(USERS_COLLECTION, targetUserId, {
        followers: arrayUnion(followerId)
      })
    ]);

    console.log(`User ${followerId} now follows ${targetUserId}`);
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
};

// Unfollow a user
export const unfollowUser = async (followerId: string, targetUserId: string): Promise<void> => {
  try {
    if (followerId === targetUserId) {
      throw new Error("Cannot unfollow yourself");
    }

    // Update both users atomically
    await Promise.all([
      // Remove from follower's following list
      updateDocument(USERS_COLLECTION, followerId, {
        following: arrayRemove(targetUserId)
      }),
      // Remove from target's followers list
      updateDocument(USERS_COLLECTION, targetUserId, {
        followers: arrayRemove(followerId)
      })
    ]);

    console.log(`User ${followerId} unfollowed ${targetUserId}`);
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};

// Check if user is following another user
export const isFollowingUser = async (followerId: string, targetUserId: string): Promise<boolean> => {
  try {
    const follower = await getUserById(followerId);
    return follower ? follower.following.includes(targetUserId) : false;
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
};

// Get user's followers
export const getUserFollowers = async (userId: string): Promise<IUser[]> => {
  try {
    const user = await getUserById(userId);
    if (!user || user.followers.length === 0) {
      return [];
    }

    return await getUsersByIds(user.followers);
  } catch (error) {
    console.error("Error getting user followers:", error);
    throw error;
  }
};

// Get users that a user is following
export const getUserFollowing = async (userId: string): Promise<IUser[]> => {
  try {
    const user = await getUserById(userId);
    if (!user || user.following.length === 0) {
      return [];
    }

    return await getUsersByIds(user.following);
  } catch (error) {
    console.error("Error getting user following:", error);
    throw error;
  }
};

// Get follow statistics for a user
export const getUserFollowStats = async (userId: string): Promise<{
  followersCount: number;
  followingCount: number;
}> => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return { followersCount: 0, followingCount: 0 };
    }

    return {
      followersCount: user.followers.length,
      followingCount: user.following.length
    };
  } catch (error) {
    console.error("Error getting follow stats:", error);
    return { followersCount: 0, followingCount: 0 };
  }
}; 
import { queryDocuments, getDocumentById, updateDocument } from "./firestore";
import { IUser } from "@/lib/types";
import { arrayUnion, arrayRemove } from "firebase/firestore";
import { getBandById } from "./bands";

const USERS_COLLECTION = "users";

// Migration function to separate following arrays for existing users
export const migrateUserFollowingData = async (userId: string): Promise<void> => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Skip if already migrated (has the new arrays)
    if (user.followingUsers || user.followingBands) {
      console.log(`User ${userId} already migrated or has new data structure`);
      return;
    }

    // Skip if no following data to migrate
    if (!user.following || user.following.length === 0) {
      console.log(`User ${userId} has no following data to migrate`);
      return;
    }

    console.log(`Migrating following data for user ${userId}`);

    // Separate users from bands
    const followingUsers: string[] = [];
    const followingBands: string[] = [];

    for (const id of user.following) {
      try {
        // Try to get as user first
        const userData = await getUserById(id);
        if (userData) {
          followingUsers.push(id);
          continue;
        }
        
        // Try to get as band
        const bandData = await getBandById(id);
        if (bandData) {
          followingBands.push(id);
        }
      } catch (error) {
        console.warn(`Could not determine type of ID ${id} for user ${userId}`);
      }
    }

    // Update user with separated arrays
    await updateDocument(USERS_COLLECTION, userId, {
      followingUsers,
      followingBands
    });

    console.log(`Migration completed for user ${userId}: ${followingUsers.length} users, ${followingBands.length} bands`);
  } catch (error) {
    console.error(`Error migrating user ${userId}:`, error);
    throw error;
  }
};

// Batch migration for all users (use carefully)
export const migrateAllUsersFollowingData = async (batchSize: number = 10): Promise<void> => {
  try {
    console.log("Starting batch migration of all users...");
    
    // Get all users
    const allUsers = await queryDocuments<IUser>(USERS_COLLECTION, []);
    console.log(`Found ${allUsers.length} users to potentially migrate`);
    
    // Process in batches
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allUsers.length / batchSize)}`);
      
      // Process batch in parallel
      const migrationPromises = batch.map(user => 
        migrateUserFollowingData(user.id).catch(error => {
          console.error(`Failed to migrate user ${user.id}:`, error);
        })
      );
      
      await Promise.all(migrationPromises);
      
      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("Batch migration completed");
  } catch (error) {
    console.error("Error in batch migration:", error);
    throw error;
  }
};

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

    // Check both old and new following arrays
    const isAlreadyFollowing = follower.following?.includes(targetUserId) || 
                              follower.followingUsers?.includes(targetUserId);
    
    if (isAlreadyFollowing) {
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
        followingUsers: arrayUnion(targetUserId),
        following: arrayUnion(targetUserId) // Keep for backward compatibility
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
        followingUsers: arrayRemove(targetUserId),
        following: arrayRemove(targetUserId) // Keep for backward compatibility
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
    if (!follower) return false;
    
    // Check both new and old following arrays
    return follower.followingUsers?.includes(targetUserId) || follower.following?.includes(targetUserId) || false;
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
    if (!user) {
      return [];
    }

    // Use the new followingUsers array, fallback to filtering the old following array
    let userIds: string[] = [];
    
    if (user.followingUsers && user.followingUsers.length > 0) {
      userIds = user.followingUsers;
    } else if (user.following && user.following.length > 0) {
      // Fallback for users with old data structure - filter out band IDs
      const userPromises = user.following.map(async (id) => {
        try {
          const foundUser = await getUserById(id);
          return foundUser ? id : null;
        } catch {
          return null; // This ID might be a band ID, not a user ID
        }
      });
      
      const results = await Promise.all(userPromises);
      userIds = results.filter((id): id is string => id !== null);
    }

    if (userIds.length === 0) {
      return [];
    }

    return await getUsersByIds(userIds);
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

    // Calculate following count from both users and bands
    const followingUsersCount = user.followingUsers?.length || 0;
    const followingBandsCount = user.followingBands?.length || 0;
    const legacyFollowingCount = user.following?.length || 0;
    
    // Use new arrays if available, otherwise fall back to legacy count
    const totalFollowingCount = (followingUsersCount + followingBandsCount) || legacyFollowingCount;

    return {
      followersCount: user.followers?.length || 0,
      followingCount: totalFollowingCount
    };
  } catch (error) {
    console.error("Error getting follow stats:", error);
    return { followersCount: 0, followingCount: 0 };
  }
}; 
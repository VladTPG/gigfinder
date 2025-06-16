import { queryDocuments, getDocumentById } from "./firestore";
import { IUser } from "@/lib/types";

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
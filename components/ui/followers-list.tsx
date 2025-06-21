"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { 
  getUserFollowers, 
  getUserFollowing,
  getUserFollowStats
} from "@/lib/firebase/users";
import {
  getBandFollowers,
  getBandFollowStats
} from "@/lib/firebase/bands";
import { IUser, IBand } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { FollowButton } from "./follow-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Skeleton } from "./skeleton";
import { Users, UserCheck } from "lucide-react";

interface FollowersListProps {
  targetId: string;
  targetType: "user" | "band";
  targetName?: string;
  defaultTab?: "followers" | "following";
}

export function FollowersList({
  targetId,
  targetType,
  targetName,
  defaultTab = "followers"
}: FollowersListProps) {
  const { userProfile } = useAuth();
  const [followers, setFollowers] = useState<IUser[]>([]);
  const [following, setFollowing] = useState<(IUser | IBand)[]>([]);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (targetType === "user") {
          // For users, get both followers and following
          const [userFollowers, userFollowing, userStats] = await Promise.all([
            getUserFollowers(targetId),
            getUserFollowing(targetId),
            getUserFollowStats(targetId)
          ]);
          
          setFollowers(userFollowers);
          setFollowing(userFollowing);
          setStats(userStats);
        } else {
          // For bands, only get followers (bands don't follow others in this implementation)
          const [bandFollowers, bandStats] = await Promise.all([
            getBandFollowers(targetId),
            getBandFollowStats(targetId)
          ]);
          
          setFollowers(bandFollowers);
          setFollowing([]);
          setStats({ ...bandStats, followingCount: 0 });
        }
      } catch (err) {
        console.error("Error fetching followers/following:", err);
        setError("Failed to load followers data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetId, targetType]);

  const handleFollowChange = () => {
    // Refresh the data when follow status changes
    const fetchData = async () => {
      try {
        if (targetType === "user") {
          const userStats = await getUserFollowStats(targetId);
          setStats(userStats);
        } else {
          const bandStats = await getBandFollowStats(targetId);
          setStats({ ...bandStats, followingCount: 0 });
        }
      } catch (err) {
        console.error("Error refreshing stats:", err);
      }
    };
    
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-xl">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-2">⚠️</div>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  const UserCard = ({ user }: { user: IUser }) => (
    <div className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors">
      <Link href={`/musician/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-500/50 flex-shrink-0">
          {user.profile.profilePicture ? (
            <Image
              src={user.profile.profilePicture}
              alt={user.profile.username}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.profile.username
                )}&background=6D28D9&color=fff`;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-300">
              {user.profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {user.profile.firstName && user.profile.lastName
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user.profile.username}
          </h3>
          <p className="text-sm text-gray-400 truncate">@{user.profile.username}</p>
          {user.profile.instruments.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {user.profile.instruments.slice(0, 2).map(instrument => (
                <span key={instrument} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full">
                  {instrument}
                </span>
              ))}
              {user.profile.instruments.length > 2 && (
                <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                  +{user.profile.instruments.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      
      <FollowButton
        targetId={user.id}
        targetType="user"
        targetName={user.profile.username}
        variant="outline"
        size="sm"
        onFollowChange={handleFollowChange}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {targetName ? `${targetName}'s Network` : "Network"}
        </h2>
        <div className="flex justify-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{stats.followersCount} followers</span>
          </div>
          {targetType === "user" && (
            <div className="flex items-center gap-1">
              <UserCheck className="w-4 h-4" />
              <span>{stats.followingCount} following</span>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="followers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Followers ({stats.followersCount})
          </TabsTrigger>
          {targetType === "user" && (
            <TabsTrigger value="following" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Following ({stats.followingCount})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="followers" className="space-y-3 mt-6">
          {followers.length > 0 ? (
            followers.map(user => (
              <UserCard key={user.id} user={user} />
            ))
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No followers yet</p>
            </div>
          )}
        </TabsContent>

        {targetType === "user" && (
          <TabsContent value="following" className="space-y-3 mt-6">
            {following.length > 0 ? (
              following.map(item => (
                <UserCard key={item.id} user={item as IUser} />
              ))
            ) : (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Not following anyone yet</p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 
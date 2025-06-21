"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { getUserById, getUserFollowers } from "@/lib/firebase/users";
import { IUser } from "@/lib/types";
import { FollowButton } from "@/components/ui/follow-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, MapPin, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function FollowersPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;
  const router = useRouter();
  const { userProfile } = useAuth();

  const [musician, setMusician] = useState<IUser | null>(null);
  const [followers, setFollowers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the musician profile
        const userData = await getUserById(uid);
        if (!userData || userData.role !== "musician") {
          setError("Musician not found");
          return;
        }

        setMusician(userData);

        // Fetch followers
        const followerUsers = await getUserFollowers(uid);
        setFollowers(followerUsers);
      } catch (err) {
        console.error("Error fetching followers data:", err);
        setError("Failed to load followers data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [uid]);

  const getDisplayName = (user: IUser) => {
    const { firstName, lastName, username } = user.profile;
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username;
  };

  const handleFollowChange = () => {
    // Refresh the data when follow status changes
    const refreshData = async () => {
      try {
        const followerUsers = await getUserFollowers(uid);
        setFollowers(followerUsers);
      } catch (err) {
        console.error("Error refreshing data:", err);
      }
    };
    refreshData();
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-gray-400">Loading followers...</p>
        </div>
      </div>
    );
  }

  if (error || !musician) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Error</h1>
          <p className="mb-6 text-gray-400">{error || "Failed to load data"}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(musician);
  const hasResults = followers.length > 0;

  return (
    <div className="min-h-screen text-white p-3 md:p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-800/30 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              {musician.profile.profilePicture ? (
                <Image
                  src={musician.profile.profilePicture}
                  alt={displayName}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      displayName
                    )}&background=6D28D9&color=fff`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{displayName}&apos;s Followers</h1>
              <p className="text-sm text-gray-400">@{musician.profile.username}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-gray-400">
          <Users className="h-4 w-4" />
          <span className="text-sm">{followers.length} followers</span>
        </div>
      </div>

      {/* Empty State */}
      {!hasResults && (
        <div className="bg-gray-800/30 p-8 rounded-2xl text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-gray-300 mb-2">No followers yet</p>
          <p className="text-gray-400 text-sm">
            {displayName} doesn&apos;t have any followers yet.
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {followers.map((follower) => {
            const followerDisplayName = getDisplayName(follower);
            return (
              <div
                key={follower.id}
                className="bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  {/* Profile Picture */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    {follower.profile.profilePicture ? (
                      <Image
                        src={follower.profile.profilePicture}
                        alt={followerDisplayName}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            followerDisplayName
                          )}&background=6D28D9&color=fff`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {followerDisplayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/musician/${follower.id}`}
                          className="font-semibold text-white hover:text-purple-400 transition-colors block truncate"
                        >
                          {followerDisplayName}
                        </Link>
                        <p className="text-sm text-gray-400 truncate">
                          @{follower.profile.username}
                        </p>
                      </div>
                      
                      {/* Follow Button - only show if current user is viewing and not their own profile */}
                      {userProfile && userProfile.id !== follower.id && (
                        <FollowButton
                          targetId={follower.id}
                          targetType="user"
                          targetName={followerDisplayName}
                          size="sm"
                          variant="outline"
                          onFollowChange={handleFollowChange}
                        />
                      )}
                    </div>

                    {/* Location */}
                    {follower.profile.location && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {follower.profile.location}
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    {follower.profile.bio && (
                      <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                        {follower.profile.bio}
                      </p>
                    )}

                    {/* Genres */}
                    {follower.profile.genres && follower.profile.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {follower.profile.genres.slice(0, 3).map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full"
                          >
                            {genre}
                          </span>
                        ))}
                        {follower.profile.genres.length > 3 && (
                          <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                            +{follower.profile.genres.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Instruments */}
                    {follower.profile.instruments && follower.profile.instruments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {follower.profile.instruments.slice(0, 3).map((instrument) => (
                          <span
                            key={instrument}
                            className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full"
                          >
                            {instrument}
                          </span>
                        ))}
                        {follower.profile.instruments.length > 3 && (
                          <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                            +{follower.profile.instruments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 
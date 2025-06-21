"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { getUserById, getUserFollowing } from "@/lib/firebase/users";
import { getUserFollowedBands } from "@/lib/firebase/bands";
import { IUser, IBand } from "@/lib/types";
import { FollowButton } from "@/components/ui/follow-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Music, MapPin, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type FollowingType = "users" | "bands";

export default function FollowingPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;
  const router = useRouter();
  const { userProfile } = useAuth();

  const [musician, setMusician] = useState<IUser | null>(null);
  const [followingUsers, setFollowingUsers] = useState<IUser[]>([]);
  const [followingBands, setFollowingBands] = useState<IBand[]>([]);
  const [activeTab, setActiveTab] = useState<FollowingType>("users");
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

        // Fetch following users and bands in parallel
        const [users, bands] = await Promise.all([
          getUserFollowing(uid),
          getUserFollowedBands(uid)
        ]);

        setFollowingUsers(users);
        setFollowingBands(bands);
      } catch (err) {
        console.error("Error fetching following data:", err);
        setError("Failed to load following data");
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
        const [users, bands] = await Promise.all([
          getUserFollowing(uid),
          getUserFollowedBands(uid)
        ]);
        setFollowingUsers(users);
        setFollowingBands(bands);
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
          <p className="text-gray-400">Loading following...</p>
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
  const currentResults = activeTab === "users" ? followingUsers : followingBands;
  const hasResults = currentResults.length > 0;

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
              <h1 className="text-xl font-bold">{displayName}&apos;s Following</h1>
              <p className="text-sm text-gray-400">@{musician.profile.username}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700">
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors",
              activeTab === "users"
                ? "bg-purple-600 text-white"
                : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
            )}
          >
            <Users className="h-4 w-4" />
            Musicians ({followingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("bands")}
            className={cn(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors",
              activeTab === "bands"
                ? "bg-purple-600 text-white"
                : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
            )}
          >
            <Music className="h-4 w-4" />
            Bands ({followingBands.length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!hasResults && (
        <div className="bg-gray-800/30 p-8 rounded-2xl text-center">
          <div className="text-5xl mb-4">
            {activeTab === "users" ? "👥" : "🎵"}
          </div>
          <p className="text-gray-300 mb-2">
            Not following any {activeTab === "users" ? "musicians" : "bands"} yet
          </p>
          <p className="text-gray-400 text-sm">
            {displayName} hasn&apos;t followed any {activeTab === "users" ? "musicians" : "bands"} yet.
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          {activeTab === "users" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followingUsers.map((followedUser) => {
                const userDisplayName = getDisplayName(followedUser);
                return (
                  <div
                    key={followedUser.id}
                    className="bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      {/* Profile Picture */}
                      <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                        {followedUser.profile.profilePicture ? (
                          <Image
                            src={followedUser.profile.profilePicture}
                            alt={userDisplayName}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                userDisplayName
                              )}&background=6D28D9&color=fff`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {userDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/musician/${followedUser.id}`}
                              className="font-semibold text-white hover:text-purple-400 transition-colors block truncate"
                            >
                              {userDisplayName}
                            </Link>
                            <p className="text-sm text-gray-400 truncate">
                              @{followedUser.profile.username}
                            </p>
                          </div>
                          
                          {/* Follow Button - only show if current user is viewing and not their own profile */}
                          {userProfile && userProfile.id !== followedUser.id && (
                            <FollowButton
                              targetId={followedUser.id}
                              targetType="user"
                              targetName={userDisplayName}
                              size="sm"
                              variant="outline"
                              onFollowChange={handleFollowChange}
                            />
                          )}
                        </div>

                        {/* Location */}
                        {followedUser.profile.location && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-500">
                              {followedUser.profile.location}
                            </span>
                          </div>
                        )}

                        {/* Bio */}
                        {followedUser.profile.bio && (
                          <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                            {followedUser.profile.bio}
                          </p>
                        )}

                        {/* Genres */}
                        {followedUser.profile.genres && followedUser.profile.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {followedUser.profile.genres.slice(0, 3).map((genre) => (
                              <span
                                key={genre}
                                className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full"
                              >
                                {genre}
                              </span>
                            ))}
                            {followedUser.profile.genres.length > 3 && (
                              <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                                +{followedUser.profile.genres.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Instruments */}
                        {followedUser.profile.instruments && followedUser.profile.instruments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {followedUser.profile.instruments.slice(0, 3).map((instrument) => (
                              <span
                                key={instrument}
                                className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full"
                              >
                                {instrument}
                              </span>
                            ))}
                            {followedUser.profile.instruments.length > 3 && (
                              <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                                +{followedUser.profile.instruments.length - 3}
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

          {activeTab === "bands" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followingBands.map((band) => (
                <div
                  key={band.id}
                  className="bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    {/* Band Picture */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                      {band.profilePicture ? (
                        <Image
                          src={band.profilePicture}
                          alt={band.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {band.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/bands/${band.id}`}
                            className="font-semibold text-white hover:text-purple-400 transition-colors block truncate"
                          >
                            {band.name}
                          </Link>
                          <p className="text-sm text-gray-400">
                            {band.members.filter(m => m.isActive).length} members
                          </p>
                        </div>
                        
                        {/* Follow Button - only show if current user is viewing and not a member */}
                        {userProfile && !band.members.some(m => m.userId === userProfile.id && m.isActive) && (
                          <FollowButton
                            targetId={band.id}
                            targetType="band"
                            targetName={band.name}
                            size="sm"
                            variant="outline"
                            onFollowChange={handleFollowChange}
                          />
                        )}
                      </div>

                      {/* Location */}
                      {band.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {band.location}
                          </span>
                        </div>
                      )}

                      {/* Bio */}
                      {band.bio && (
                        <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                          {band.bio}
                        </p>
                      )}

                      {/* Genres */}
                      {band.genres && band.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {band.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full"
                            >
                              {genre}
                            </span>
                          ))}
                          {band.genres.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                              +{band.genres.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
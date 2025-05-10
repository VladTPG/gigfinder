"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDocumentById } from "@/lib/firebase/firestore";
import { IUser } from "@/lib/types";
import { IVideo } from "@/lib/types";
import ProfileRouteHandler from "./route-handler";

// All available instruments with their SVG paths
const allInstruments = [
  { id: "guitar", label: "Guitar", svg: "/guitar.svg" },
  { id: "piano", label: "Piano", svg: "/piano.svg" },
  { id: "voice", label: "Voice", svg: "/mic.svg" },
  { id: "bass", label: "Bass", svg: "/bass.svg" },
  { id: "drums", label: "Drums", svg: "/drums.svg" },
];

export default function ProfilePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [following, setFollowing] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userProfile) return;

      try {
        // Fetch videos
        if (userProfile.videos && userProfile.videos.length > 0) {
          const videoPromises = userProfile.videos
            .slice(0, 3)
            .map((videoId) => getDocumentById("videos", videoId));
          const videoResults = await Promise.all(videoPromises);
          setVideos(videoResults.filter(Boolean) as IVideo[]);
        }

        // Fetch following
        if (userProfile.following && userProfile.following.length > 0) {
          const followingPromises = userProfile.following
            .slice(0, 4)
            .map((userId) => getDocumentById("users", userId));
          const followingResults = await Promise.all(followingPromises);
          setFollowing(followingResults.filter(Boolean) as IUser[]);
        }
      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userProfile]);

  if (!userProfile && !loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Profile not found</h1>
          <p className="mb-6 text-gray-400">
            There was a problem loading the profile. Please try again.
          </p>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen  text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Get display name (username + real name if available)
  const displayName =
    userProfile.profile.firstName && userProfile.profile.lastName
      ? `${userProfile.profile.firstName} ${userProfile.profile.lastName}`
      : userProfile.profile.username;

  // Check if an instrument is in the user's profile
  const hasInstrument = (instrumentId: string) => {
    return userProfile.profile.instruments?.includes(instrumentId) || false;
  };

  return (
    <>
      <ProfileRouteHandler />

      <div className="min-h-screen text-white pb-2 md:pb-0 md:min-w-lg">
        {/* Profile header */}
        <div className="flex flex-col items-center my-4 bg-gray-800/30 px-5 py-2 rounded-2xl">
          <div className="relative w-28 h-28 mb-4 flex items-center justify-center ">
            {/* Outer glow element */}
            <div className="absolute w-[300%] h-[300%] rounded-full bg-violet-400/90 blur-[150px] -z-20"></div>
            {/* Profile image container */}
            <div className="w-24 h-24 rounded-full overflow-hidden relative z-10">
              {userProfile.profile.profilePicture ? (
                <Image
                  src={userProfile.profile.profilePicture}
                  alt={userProfile.profile.username}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to avatar on error
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite error loop
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      userProfile.profile.username
                    )}&background=6D28D9&color=fff`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-purple-800 flex items-center justify-center text-2xl font-bold ">
                  {userProfile.profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <h1 className=" text-xl font-bold mb-1">{displayName}</h1>

          <Link
            href="/profile/edit"
            className="bg-gray-600 text-sm rounded-full px-4 py-1 my-3 hover:bg-gray-700 hover:shadow-center-glow transition-all duration-300"
          >
            Edit profile
          </Link>

          <p className="text-sm text-center text-gray-400 mb-3">
            {userProfile.profile.bio || "No bio added yet."}
          </p>

          {/* Genres */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {userProfile.profile.genres &&
            userProfile.profile.genres.length > 0 ? (
              userProfile.profile.genres.map((genre, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-600 text-sm rounded-full"
                >
                  {genre}
                </span>
              ))
            ) : (
              <span className="px-3 py-1 bg-gray-600 text-sm rounded-full">
                No genres selected
              </span>
            )}
          </div>

          {/* Instruments - Show all instruments, highlight selected ones */}
          <div className="flex justify-center gap-12 mb-8 flex-wrap">
            {allInstruments.map((instrument) => {
              const isSelected = hasInstrument(instrument.id);
              return (
                <div
                  key={instrument.id}
                  className={`w-10 h-10 rounded-md flex items-center justify-center ${
                    isSelected ? "filter brightness-0 invert" : ""
                  }`}
                  title={instrument.label}
                >
                  <div className="relative w-7 h-7">
                    <Image
                      src={instrument.svg}
                      alt={instrument.label}
                      width={28}
                      height={28}
                      className={isSelected ? "opacity-100" : ""}
                      style={{
                        filter: isSelected ? "none" : "grayscale(100%)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demos section */}
        <div className="px-4 mb-4 bg-gray-800/30 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              My demos - {videos.length || 0}
            </h2>
            <Link href="/videos" className="text-sm text-gray-400">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {videos.length > 0 ? (
              videos.map((video, i) => (
                <div key={i} className="relative">
                  <div className="aspect-video bg-gray-800 rounded-md overflow-hidden">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        layout="fill"
                        objectFit="cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-1 truncate">{video.title}</p>
                  <div className="flex items-center mt-1">
                    {video.title.toLowerCase().includes("piano") && (
                      <Image
                        src="/piano.svg"
                        alt="Piano"
                        width={16}
                        height={16}
                      />
                    )}
                    {video.title.toLowerCase().includes("guitar") && (
                      <Image
                        src="/guitar.svg"
                        alt="Guitar"
                        width={16}
                        height={16}
                      />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center py-10 text-center">
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-gray-400">No demos posted yet.</p>
                <p className="text-xs text-gray-500 mt-2">
                  Record and share your music to showcase your talent
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Following section */}
        <div className="px-4 bg-gray-800/30 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              Following - {userProfile.following?.length || 0}
            </h2>
            <Link href="/following" className="text-sm text-gray-400">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {following.length > 0 ? (
              following.map((followedUser, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden mb-1">
                    {followedUser.profile.profilePicture ? (
                      <Image
                        src={followedUser.profile.profilePicture}
                        alt={followedUser.profile.username}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to avatar on error
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Prevent infinite error loop
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            followedUser.profile.username
                          )}&background=374151&color=fff`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-lg">
                        {followedUser.profile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-center truncate w-full">
                    {followedUser.profile.username}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-4 flex flex-col items-center justify-center py-10 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-gray-400">Not following anyone yet.</p>
                <p className="text-xs text-gray-500 mt-2">
                  Follow other musicians to see their updates
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDocumentById, queryDocuments } from "@/lib/firebase/firestore";
import { getUpcomingAcceptedGigs } from "@/lib/firebase/gigs";
import { IUser, IGig } from "@/lib/types";
import { IVideo } from "@/lib/types";
import ProfileRouteHandler from "./route-handler";
import VideoPlayer from "@/components/VideoPlayer";
import { getYouTubeThumbnail } from "@/lib/utils";

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
  const [totalVideos, setTotalVideos] = useState(0);
  const [following, setFollowing] = useState<IUser[]>([]);
  const [acceptedGigs, setAcceptedGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userProfile) return;

      try {
        // Fetch videos by userId (new method)
        const userVideos = await queryDocuments("videos", [
          { field: "userId", operator: "==", value: userProfile.id }
        ]);
        const allVideos = userVideos as IVideo[];
        setTotalVideos(allVideos.length);
        setVideos(allVideos.slice(0, 3));

        // Fetch following users using the new method
        const { getUserFollowing } = await import("@/lib/firebase/users");
        const followingUsers = await getUserFollowing(userProfile.id);
        setFollowing(followingUsers.slice(0, 4));

        // Fetch accepted gigs
        const acceptedGigsData = await getUpcomingAcceptedGigs(userProfile.id);
        setAcceptedGigs(acceptedGigsData);
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

          {/* Follow Stats */}
          <div className="flex justify-center gap-6 mb-4">
            <Link
              href={`/profile/followers`}
              className="text-center hover:text-purple-400 transition-colors"
            >
              <div className="text-lg font-bold">{userProfile.followers?.length || 0}</div>
              <div className="text-xs text-gray-400">Followers</div>
            </Link>
            <Link
              href={`/profile/following`}
              className="text-center hover:text-purple-400 transition-colors"
            >
              <div className="text-lg font-bold">
                {(userProfile.followingUsers?.length || 0) + (userProfile.followingBands?.length || 0) || userProfile.following?.length || 0}
              </div>
              <div className="text-xs text-gray-400">Following</div>
            </Link>
          </div>

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
              My demos - {totalVideos || 0}
            </h2>
            <Link href="/videos" className="text-sm text-gray-400">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {videos.length > 0 ? (
              videos.map((video, i) => (
                <div key={i} className="relative">
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="aspect-video bg-gray-800 rounded-md overflow-hidden relative w-full hover:ring-2 hover:ring-purple-500 transition-all group"
                  >
                    {video.youtubeId ? (
                      <Image
                        src={getYouTubeThumbnail(video.youtubeId)}
                        alt={video.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          // Fallback to a different thumbnail quality or placeholder
                          const target = e.target as HTMLImageElement;
                          if (video.youtubeId && !target.src.includes('mqdefault')) {
                            target.src = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
                          } else if (video.youtubeId && !target.src.includes('default.jpg')) {
                            target.src = `https://img.youtube.com/vi/${video.youtubeId}/default.jpg`;
                          } else {
                            // Final fallback to a placeholder
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMzAgOTBMMTgwIDEyMFYxODBIMTMwVjkwWiIgZmlsbD0iI0VGNDQ0NCIvPgo8L3N2Zz4K';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                    )}
                    {/* YouTube play button overlay */}
                    {video.isYouTube && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                  <p className="text-xs mt-1 truncate">{video.title}</p>
                  
                  {/* Show genre and instrument tags with better separation */}
                  <div className="space-y-1 mt-2">
                    {/* Genre tags */}
                    {video.genres && video.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-purple-400 text-xs font-medium">Genres:</span>
                          {video.genres.slice(0, 2).map(genre => (
                            <span key={genre} className="px-1 py-0.5 bg-purple-600/30 text-purple-300 text-xs rounded">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Instrument tags */}
                    {video.instruments && video.instruments.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-blue-400 text-xs font-medium">Instruments:</span>
                          {video.instruments.slice(0, 2).map(instrument => (
                            <span key={instrument} className="px-1 py-0.5 bg-blue-600/30 text-blue-300 text-xs rounded">
                              {instrument}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center py-10 text-center">
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-gray-400">No demos posted yet.</p>
                <p className="text-xs text-gray-500 mt-2">
                  Add YouTube videos to showcase your talent
                </p>
                <Link 
                  href="/videos" 
                  className="mt-3 text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded transition-colors"
                >
                  Add Videos
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Accepted Gigs section */}
        <div className="px-4 mb-4 bg-gray-800/30 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              Upcoming Gigs - {acceptedGigs.length || 0}
            </h2>
          </div>

          <div className="space-y-3">
            {acceptedGigs.length > 0 ? (
              acceptedGigs.map((gig: IGig) => {
                const formatDate = (date: Date) => {
                  return {
                    day: date.getDate().toString(),
                    month: date.toLocaleDateString("en-US", { month: "short" }),
                    year: date.getFullYear().toString(),
                  };
                };

                const formatTime = (time: string) => {
                  const [hours, minutes] = time.split(":");
                  const hour24 = parseInt(hours);
                  const ampm = hour24 >= 12 ? "PM" : "AM";
                  const hour12 = hour24 % 12 || 12;
                  return `${hour12}:${minutes} ${ampm}`;
                };

                const dateInfo = formatDate(gig.date);

                return (
                  <Link
                    key={gig.id}
                    href={`/gigs/${gig.id}`}
                    className="flex items-center p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-16 h-16 bg-green-600/20 rounded-lg flex flex-col items-center justify-center mr-3 flex-shrink-0 border border-green-500/30">
                      <span className="text-lg font-bold text-green-400">{dateInfo.day}</span>
                      <span className="text-xs text-green-300">{dateInfo.month}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-medium text-white truncate">{gig.title}</h3>
                      <p className="text-sm text-gray-400 truncate">{gig.venueName}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{formatTime(gig.startTime)} - {formatTime(gig.endTime)}</span>
                        {gig.paymentAmount && (
                          <span>${gig.paymentAmount} {gig.paymentCurrency}</span>
                        )}
                      </div>
                      {gig.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {gig.genres.slice(0, 2).map((genre: string) => (
                            <span key={genre} className="px-1 py-0.5 bg-blue-600/30 text-blue-300 text-xs rounded">
                              {genre}
                            </span>
                          ))}
                          {gig.genres.length > 2 && (
                            <span className="px-1 py-0.5 bg-gray-600/30 text-gray-300 text-xs rounded">
                              +{gig.genres.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded-full border border-green-500/30 mr-2">
                        Accepted
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-4xl mb-3">🎤</div>
                <p className="text-gray-400">No upcoming gigs.</p>
                <p className="text-xs text-gray-500 mt-2">
                  Apply to gigs to start performing
                </p>
                <Link 
                  href="/gigs" 
                  className="mt-3 text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded transition-colors"
                >
                  Browse Gigs
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Following section */}
        <div className="px-4 bg-gray-800/30 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              Following - {userProfile.followingUsers?.length || userProfile.following?.length || 0}
            </h2>
            <Link
              href="/profile/following"
              className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {following.length > 0 ? (
              following.map((followedUser, i) => {
                const displayName = followedUser.profile.firstName && followedUser.profile.lastName
                  ? `${followedUser.profile.firstName} ${followedUser.profile.lastName}`
                  : followedUser.profile.username;

                return (
                  <Link
                    key={followedUser.id}
                    href={`/musician/${followedUser.id}`}
                    className="flex flex-col items-center group hover:bg-gray-700/30 rounded-lg p-2 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-2 ring-2 ring-transparent group-hover:ring-purple-500/50 transition-all">
                      {followedUser.profile.profilePicture ? (
                        <Image
                          src={followedUser.profile.profilePicture}
                          alt={displayName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to avatar on error
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite error loop
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              displayName
                            )}&background=6D28D9&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-center truncate w-full group-hover:text-purple-400 transition-colors">
                      {followedUser.profile.username}
                    </span>
                    {displayName !== followedUser.profile.username && (
                      <span className="text-xs text-gray-500 text-center truncate w-full">
                        {displayName}
                      </span>
                    )}
                  </Link>
                );
              })
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

      {/* Video Player Modal */}
      <VideoPlayer 
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}

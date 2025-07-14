"use client";

import { useState, useEffect } from "react";
import { getDocumentById, queryDocuments } from "@/lib/firebase/firestore";
import { getUserBands } from "@/lib/firebase/bands";
import { getUpcomingAcceptedGigs } from "@/lib/firebase/gigs";
import { useRouter } from "next/navigation";
import { IUser, IVideo, IBand, IGig } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import { getYouTubeThumbnail } from "@/lib/utils";
import { FollowButton } from "@/components/ui/follow-button";

// Instruments with their SVG paths
const allInstruments = [
  { id: "guitar", label: "Guitar", svg: "/guitar.svg" },
  { id: "piano", label: "Piano", svg: "/piano.svg" },
  { id: "voice", label: "Voice", svg: "/mic.svg" },
  { id: "bass", label: "Bass", svg: "/bass.svg" },
  { id: "drums", label: "Drums", svg: "/drums.svg" },
];

export default function MusicianProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;

  const [musician, setMusician] = useState<IUser | null>(null);
  const [userBands, setUserBands] = useState<IBand[]>([]);
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [following, setFollowing] = useState<IUser[]>([]);
  const [acceptedGigs, setAcceptedGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMusician = async () => {
      try {
        // Fetch the musician profile from the users collection
        const userData = await getDocumentById<IUser>("users", uid);

        if (userData && userData.role === "musician") {
          setMusician(userData);
          
          // Fetch user's bands
          const bands = await getUserBands(uid);
          setUserBands(bands);

          // Fetch videos by userId (new method)
          const userVideos = await queryDocuments("videos", [
            { field: "userId", operator: "==", value: uid }
          ]);
          setVideos((userVideos as IVideo[]).slice(0, 3));

          // Fetch following users using the new method
          const { getUserFollowing } = await import("@/lib/firebase/users");
          const followingUsers = await getUserFollowing(uid);
          setFollowing(followingUsers.slice(0, 4));

          // Fetch accepted gigs
          const gigs = await getUpcomingAcceptedGigs(uid);
          setAcceptedGigs(gigs);
        } else {
          setError("Musician not found");
        }
      } catch (err) {
        console.error("Error fetching musician:", err);
        setError("Failed to load musician profile");
      } finally {
        setLoading(false);
      }
    };

    fetchMusician();
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !musician) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Profile not found</h1>
          <p className="mb-6 text-gray-400">
            {error ||
              "There was a problem loading the profile. Please try again."}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get display name (username + real name if available)
  const displayName =
    musician.profile.firstName && musician.profile.lastName
      ? `${musician.profile.firstName} ${musician.profile.lastName}`
      : musician.profile.username;

  // Check if musician plays a specific instrument
  const hasInstrument = (instrumentId: string) => {
    return musician.profile.instruments?.includes(instrumentId) || false;
  };

  return (
    <div className="min-h-screen text-white pb-2 md:pb-0 md:min-w-lg">
      {/* Back button */}
      <div className="p-4 max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center my-4 bg-gray-800/30 px-5 py-2 rounded-2xl max-w-3xl mx-auto">
        <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
          {/* Outer glow element */}
          <div className="absolute w-[300%] h-[300%] rounded-full bg-violet-400/90 blur-[150px] -z-20"></div>
          {/* Profile image container */}
          <div className="w-24 h-24 rounded-full overflow-hidden relative z-10">
            {musician.profile.profilePicture ? (
              <Image
                src={musician.profile.profilePicture}
                alt={musician.profile.username}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to avatar on error
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error loop
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    musician.profile.username
                  )}&background=6D28D9&color=fff`;
                }}
              />
            ) : (
              <div className="w-full h-full bg-purple-800 flex items-center justify-center text-2xl font-bold">
                {musician.profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold mb-1">{displayName}</h1>

        {musician.profile.location && (
          <p className="text-sm text-center text-gray-400">
            {musician.profile.location}
          </p>
        )}

        <p className="text-sm text-center text-gray-400 mb-3 mt-3">
          {musician.profile.bio || "No bio added yet."}
        </p>

        {/* Follow Stats */}
        <div className="flex justify-center gap-6 mb-4">
          <Link
            href={`/musician/${musician.id}/followers`}
            className="text-center hover:text-purple-400 transition-colors"
          >
            <div className="text-lg font-bold">{musician.followers?.length || 0}</div>
            <div className="text-xs text-gray-400">Followers</div>
          </Link>
          <Link
            href={`/musician/${musician.id}/following`}
            className="text-center hover:text-purple-400 transition-colors"
          >
            <div className="text-lg font-bold">
              {(musician.followingUsers?.length || 0) + (musician.followingBands?.length || 0) || musician.following?.length || 0}
            </div>
            <div className="text-xs text-gray-400">Following</div>
          </Link>
        </div>

        {/* Follow Button */}
        <div className="mb-4">
          <FollowButton
            targetId={musician.id}
            targetType="user"
            targetName={displayName}
            variant="outline"
            size="sm"
            className="mx-auto"
          />
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {musician.profile.genres && musician.profile.genres.length > 0 ? (
            musician.profile.genres.map((genre: string, i: number) => (
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
      <div className="px-4 mb-4 bg-gray-800/30 p-5 rounded-2xl max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Demos - {videos.length || 0}</h2>
          <Link
            href={`/musician/${musician.id}/videos`}
            className="text-sm text-gray-400"
          >
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
              <p className="text-gray-400">No demos available.</p>
              <p className="text-xs text-gray-500 mt-2">
                This musician hasn&apos;t posted any demos yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Following section */}
      <div className="px-4 bg-gray-800/30 p-5 rounded-2xl max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">
            Following - {musician.followingUsers?.length || musician.following?.length || 0}
          </h2>
          <Link
            href={`/musician/${musician.id}/following`}
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
              <p className="text-gray-400">Not following anyone.</p>
              <p className="text-xs text-gray-500 mt-2">
                This musician isn&apos;t following anyone yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bands section (if data is available) */}
      {userBands && userBands.length > 0 && (
        <div className="px-4 mt-4 bg-gray-800/30 p-5 rounded-2xl max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              Bands - {userBands.length || 0}
            </h2>
          </div>
          <div className="space-y-3">
            {userBands.map((band: IBand, index: number) => {
              // Find user's role in this band
              const userMember = band.members.find(member => member.userId === uid && member.isActive);
              const userRole = userMember ? userMember.role : "Member";
              
              return (
                <div
                  key={band.id}
                  className="flex items-center p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => router.push(`/bands/${band.id}`)}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
                    {band.profilePicture ? (
                      <Image
                        src={band.profilePicture}
                        alt={band.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {band.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-white truncate">{band.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {userRole}
                    </p>
                    {band.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {band.genres.slice(0, 2).map((genre: string) => (
                          <span key={genre} className="px-1 py-0.5 bg-purple-600/30 text-purple-300 text-xs rounded">
                            {genre}
                          </span>
                        ))}
                        {band.genres.length > 2 && (
                          <span className="px-1 py-0.5 bg-gray-600/30 text-gray-300 text-xs rounded">
                            +{band.genres.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
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
              );
            })}
          </div>
        </div>
      )}

      {/* Accepted Gigs section */}
      <div className="px-4 mt-4 bg-gray-800/30 p-5 rounded-2xl max-w-3xl mx-auto">
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
                This musician hasn&apos;t been accepted to any gigs yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      <VideoPlayer 
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}

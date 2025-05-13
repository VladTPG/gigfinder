"use client";

import { useState, useEffect } from "react";
import { getDocumentById } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { IUser, IVideo } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";

// Instruments with their SVG paths
const allInstruments = [
  { id: "guitar", label: "Guitar", svg: "/guitar.svg" },
  { id: "piano", label: "Piano", svg: "/piano.svg" },
  { id: "voice", label: "Voice", svg: "/mic.svg" },
  { id: "bass", label: "Bass", svg: "/bass.svg" },
  { id: "drums", label: "Drums", svg: "/drums.svg" },
];

// Band interface
interface Band {
  id: string;
  name: string;
  imageUrl?: string;
  role?: string;
}

// Extended user interface with bands
interface MusicianWithBands extends IUser {
  bands?: Band[];
}

export default function MusicianProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;

  const [musician, setMusician] = useState<MusicianWithBands | null>(null);
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [following, setFollowing] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMusician = async () => {
      try {
        // Fetch the musician profile from the users collection
        const userData = await getDocumentById<MusicianWithBands>("users", uid);

        if (userData && userData.role === "musician") {
          setMusician(userData);

          // Fetch videos if available
          if (userData.videos && userData.videos.length > 0) {
            const videoPromises = userData.videos
              .slice(0, 3) // Limit to 3 videos for now
              .map((videoId) => getDocumentById<IVideo>("videos", videoId));

            const videoResults = await Promise.all(videoPromises);
            setVideos(videoResults.filter(Boolean) as IVideo[]);
          }

          // Fetch following if available
          if (userData.following && userData.following.length > 0) {
            const followingPromises = userData.following
              .slice(0, 4)
              .map((userId) => getDocumentById("users", userId));
            const followingResults = await Promise.all(followingPromises);
            setFollowing(followingResults.filter(Boolean) as IUser[]);
          }
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

        {/* Genres */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {musician.profile.genres && musician.profile.genres.length > 0 ? (
            musician.profile.genres.map((genre, i) => (
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
              <div
                key={i}
                className="relative cursor-pointer"
                onClick={() => router.push(`/videos/${video.id}`)}
              >
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
            Following - {musician.following?.length || 0}
          </h2>
          <Link
            href={`/musician/${musician.id}/following`}
            className="text-sm text-gray-400"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {following.length > 0 ? (
            following.map((followedUser, i) => (
              <div
                key={i}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => router.push(`/musician/${followedUser.id}`)}
              >
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
              <p className="text-gray-400">Not following anyone.</p>
              <p className="text-xs text-gray-500 mt-2">
                This musician isn&apos;t following anyone yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bands section (if data is available) */}
      {musician.bands && musician.bands.length > 0 && (
        <div className="px-4 mt-4 bg-gray-800/30 p-5 rounded-2xl max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              Bands - {musician.bands.length || 0}
            </h2>
          </div>
          <div className="space-y-3">
            {musician.bands.map((band, index) => (
              <div
                key={index}
                className="flex items-center p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer"
                onClick={() => router.push(`/band/${band.id}`)}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
                  <img
                    src={
                      band.imageUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        band.name
                      )}&background=DB2777&color=fff&size=48`
                    }
                    alt={band.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-medium text-white truncate">{band.name}</p>
                  {band.role && (
                    <p className="text-xs text-gray-400 truncate">
                      {band.role}
                    </p>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

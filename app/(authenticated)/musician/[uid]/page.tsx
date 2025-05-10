"use client";

import { useState, useEffect } from "react";
import { getDocumentById } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { IUser, IVideo } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";

// Instruments with their SVG paths
const instruments = [
  { id: "guitar", label: "Guitar", icon: "/guitar.svg" },
  { id: "piano", label: "Piano", icon: "/piano.svg" },
  { id: "voice", label: "Voice", icon: "/mic.svg" },
  { id: "bass", label: "Bass", icon: "/bass.svg" },
  { id: "drums", label: "Drums", icon: "/drums.svg" },
];

// Add a Band interface
interface Band {
  id: string;
  name: string;
  imageUrl?: string;
  role?: string;
}

export default function MusicianProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;

  const [musician, setMusician] = useState<IUser | null>(null);
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMusician = async () => {
      try {
        // Fetch the musician profile from the users collection
        const userData = await getDocumentById<IUser>("users", uid);

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !musician) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p>{error || "Musician not found"}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:text-blue-700 font-medium flex items-center justify-center mx-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Go Back
        </button>
      </div>
    );
  }

  // Get display name (username + real name if available)
  const displayName =
    musician.profile.firstName && musician.profile.lastName
      ? `${musician.profile.firstName} ${musician.profile.lastName}`
      : musician.profile.username;

  // Generate avatar URL if no profile picture
  const avatarUrl =
    musician.profile.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      musician.profile.username
    )}&background=6D28D9&color=fff&size=256`;

  // Check if musician plays a specific instrument
  const hasInstrument = (instrumentId: string) => {
    return musician.profile.instruments?.includes(instrumentId) || false;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
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
      <div className="bg-gray-800/30 rounded-2xl overflow-hidden mb-8">
        {/* Banner image - placeholder gradient */}
        <div className="h-40 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 relative">
          {/* Profile image - positioned to overlap the banner */}
          <div className="absolute -bottom-16 left-8">
            <div className="w-32 h-32 rounded-full border-4 border-gray-900 overflow-hidden">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to avatar on error
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error loop
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    musician.profile.username
                  )}&background=6D28D9&color=fff&size=256`;
                }}
              />
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="pt-20 px-8 pb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {displayName}
              </h1>
              {musician.profile.location && (
                <p className="text-gray-400 flex items-center mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {musician.profile.location}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {musician.profile.bio && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2 text-white">About</h2>
              <p className="text-gray-300">{musician.profile.bio}</p>
            </div>
          )}

          {/* Instruments */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3 text-white">
              Instruments
            </h2>
            <div className="flex gap-4 flex-wrap">
              {instruments.map((instrument) => {
                const isPlayed = hasInstrument(instrument.id);
                return (
                  <div
                    key={instrument.id}
                    className={`flex flex-col items-center rounded p-3 ${
                      isPlayed
                        ? "bg-purple-800/30"
                        : "bg-gray-800/30 opacity-50"
                    }`}
                    title={instrument.label}
                  >
                    <div className="w-10 h-10 relative">
                      <img
                        src={instrument.icon}
                        alt={instrument.label}
                        className={`w-full h-full ${
                          isPlayed ? "filter-none" : "grayscale"
                        }`}
                      />
                    </div>
                    <span className="text-xs mt-1 text-gray-300">
                      {instrument.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Genres */}
          {musician.profile.genres && musician.profile.genres.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2 text-white">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {musician.profile.genres.map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {musician.email && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2 text-white">Contact</h2>
              <a
                href={`mailto:${musician.email}`}
                className="text-purple-400 hover:underline"
              >
                {musician.email}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Videos/Demos */}
      {videos.length > 0 && (
        <div className="bg-gray-800/30 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Demos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {videos.map((video, idx) => (
              <div
                key={idx}
                className="cursor-pointer"
                onClick={() => router.push(`/videos/${video.id}`)}
              >
                <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">🎵</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <h3 className="mt-2 font-medium text-white">{video.title}</h3>
                {/* Only show description if it exists on the video object */}
                {video.description ? (
                  <p className="text-sm text-gray-400">
                    {(video.description as string).substring(0, 60)}
                    {(video.description as string).length > 60 ? "..." : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bands (if data is available) */}
      {(musician as any).bands && (musician as any).bands.length > 0 && (
        <div className="bg-gray-800/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Bands</h2>
          <div className="space-y-4">
            {(musician as any).bands.map((band: Band, index: number) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer"
                onClick={() => router.push(`/band/${band.id}`)}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
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
                  <div>
                    <p className="font-medium text-white">{band.name}</p>
                    {band.role && (
                      <p className="text-sm text-gray-400">{band.role}</p>
                    )}
                  </div>
                </div>
                <span className="text-purple-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

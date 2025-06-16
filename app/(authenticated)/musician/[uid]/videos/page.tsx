"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Image from "next/image";
import { IUser, IVideo } from "@/lib/types";
import { getDocumentById, queryDocuments } from "@/lib/firebase/firestore";
import VideoPlayer from "@/components/VideoPlayer";
import { getYouTubeThumbnail } from "@/lib/utils";

// Available instruments and genres
const allInstruments = [
  { id: "guitar", label: "Guitar" },
  { id: "piano", label: "Piano" },
  { id: "voice", label: "Voice" },
  { id: "bass", label: "Bass" },
  { id: "drums", label: "Drums" },
  { id: "violin", label: "Violin" },
  { id: "saxophone", label: "Saxophone" },
  { id: "trumpet", label: "Trumpet" },
];

const allGenres = [
  "Rock", "Pop", "Jazz", "Blues", "Classical", "Electronic", 
  "Hip Hop", "R&B", "Country", "Folk", "Metal", "Punk", 
  "Reggae", "Soul", "Funk", "Alternative", "Indie", 
  "Experimental", "World", "Latin"
];

export default function MusicianVideosPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;
  const router = useRouter();
  
  // State management
  const [musician, setMusician] = useState<IUser | null>(null);
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  
  // Filter state
  const [filterGenre, setFilterGenre] = useState("");
  const [filterInstrument, setFilterInstrument] = useState("");

  // Load musician and videos
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch musician profile
        const musicianData = await getDocumentById<IUser>("users", uid);
        
        if (!musicianData || musicianData.role !== "musician") {
          setError("Musician not found");
          return;
        }
        
        setMusician(musicianData);
        
        // Fetch all videos for this musician
        const userVideos = await queryDocuments("videos", [
          { field: "userId", operator: "==", value: uid }
        ]);
        
        setVideos(userVideos as IVideo[]);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load musician videos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [uid]);

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const genreMatch = !filterGenre || video.genres?.includes(filterGenre);
    const instrumentMatch = !filterInstrument || video.instruments?.includes(filterInstrument);
    return genreMatch && instrumentMatch;
  });

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
          <h1 className="text-xl font-semibold mb-4">Not found</h1>
          <p className="mb-6 text-gray-400">{error || "Musician not found"}</p>
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

  const displayName = musician.profile.firstName && musician.profile.lastName
    ? `${musician.profile.firstName} ${musician.profile.lastName}`
    : musician.profile.username;

  return (
    <div className="min-h-screen text-white p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            {musician.profile.profilePicture ? (
              <Image
                src={musician.profile.profilePicture}
                alt={musician.profile.username}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-purple-800 flex items-center justify-center text-lg font-bold">
                {musician.profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-gray-400">{videos.length} videos</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {videos.length > 0 && (
        <div className="bg-gray-800/30 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium mb-3">Filter Videos</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Genre</label>
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">All Genres</option>
                {allGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Instrument</label>
              <select
                value={filterInstrument}
                onChange={(e) => setFilterInstrument(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">All Instruments</option>
                {allInstruments.map(instrument => (
                  <option key={instrument.id} value={instrument.id}>{instrument.label}</option>
                ))}
              </select>
            </div>
            
            {(filterGenre || filterInstrument) && (
              <button
                onClick={() => {
                  setFilterGenre("");
                  setFilterInstrument("");
                }}
                className="self-end bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div key={video.id} className="bg-gray-800/50 rounded-lg overflow-hidden">
              {/* Video Thumbnail */}
              <div className="relative aspect-video bg-gray-900">
                               <Image
                 src={video.youtubeId ? getYouTubeThumbnail(video.youtubeId) : video.thumbnailUrl}
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
                <button
                  onClick={() => setSelectedVideo(video)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/30 transition-colors group"
                >
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </button>
              </div>
              
              {/* Video Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{video.title}</h3>
                <p className="text-gray-400 text-sm mb-3">{video.artist}</p>
                
                {video.description && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">{video.description}</p>
                )}
                
                {/* Tags */}
                <div className="space-y-2">
                  {video.genres && video.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.genres.map(genre => (
                        <span key={genre} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {video.instruments && video.instruments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.instruments.map(instrument => (
                        <span key={instrument} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded">
                          {allInstruments.find(i => i.id === instrument)?.label || instrument}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* External Link */}
                <div className="mt-4">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    View on YouTube
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-semibold mb-2">
            {videos.length === 0 ? "No videos yet" : "No videos match your filters"}
          </h3>
          <p className="text-gray-400 mb-6">
            {videos.length === 0 
              ? `${displayName} hasn't posted any videos yet`
              : "Try adjusting your filters to see more videos"
            }
          </p>
        </div>
      )}

      {/* Video Player Modal */}
      <VideoPlayer 
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
} 
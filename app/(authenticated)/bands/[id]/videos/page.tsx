"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IBand, IVideo, BandPermission } from "@/lib/types";
import { getBandById, hasPermission } from "@/lib/firebase/bands";
import { 
  queryDocuments, 
  addDocument, 
  updateDocument, 
  deleteDocument 
} from "@/lib/firebase/firestore";
import { 
  extractYouTubeId, 
  getYouTubeThumbnail, 
  isValidYouTubeUrl 
} from "@/lib/utils";
import VideoPlayer from "@/components/VideoPlayer";

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

export default function BandVideosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const bandId = unwrappedParams.id;
  const { userProfile } = useAuth();
  const router = useRouter();
  
  // State management
  const [band, setBand] = useState<IBand | null>(null);
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  
  // Add video form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState("");

  // Load band and videos
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load band data
        const bandData = await getBandById(bandId);
        if (!bandData) {
          setError("Band not found");
          return;
        }
        setBand(bandData);
        
        // Load videos
        const videosData = await queryDocuments<IVideo>("videos", [
          { field: "bandId", operator: "==", value: bandId }
        ]);
        setVideos(videosData.sort((a, b) => {
          const dateA = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
            ? (a.createdAt as any).toDate() 
            : new Date(0);
          const dateB = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt 
            ? (b.createdAt as any).toDate() 
            : new Date(0);
          return dateB.getTime() - dateA.getTime();
        }));
        
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load band videos");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [bandId]);

  // Permission check
  const canManageVideos = () => {
    if (!userProfile || !band) return false;
    return hasPermission(band, userProfile.id, BandPermission.MANAGE_VIDEOS);
  };

  // Form validation
  const validateYouTubeUrl = (url: string): string => {
    if (!url) return "";
    if (!isValidYouTubeUrl(url)) {
      return "Please enter a valid YouTube URL";
    }
    return "";
  };

  // Add video handler
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageVideos() || isSubmitting) return;

    const urlValidationError = validateYouTubeUrl(youtubeUrl);
    if (urlValidationError) {
      setUrlError(urlValidationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setUrlError("");

      const youtubeId = extractYouTubeId(youtubeUrl);
      if (!youtubeId) {
        setUrlError("Could not extract video ID from URL");
        return;
      }

      const videoData: Omit<IVideo, "id"> = {
        title: title || "Untitled Video",
        artist: artist || band!.name,
        description,
        videoUrl: youtubeUrl,
        youtubeId,
        isYouTube: true,
        isBandVideo: true,
        thumbnailUrl: getYouTubeThumbnail(youtubeId),
        genres: selectedGenres,
        instruments: selectedInstruments,
        userId: userProfile!.id,
        bandId: bandId,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };

      await addDocument("videos", videoData);
      
      // Refresh videos
      const videosData = await queryDocuments<IVideo>("videos", [
        { field: "bandId", operator: "==", value: bandId }
      ]);
      setVideos(videosData.sort((a, b) => {
        const dateA = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
          ? (a.createdAt as any).toDate() 
          : new Date(0);
        const dateB = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt 
          ? (b.createdAt as any).toDate() 
          : new Date(0);
        return dateB.getTime() - dateA.getTime();
      }));

      // Reset form
      setShowAddForm(false);
      setYoutubeUrl("");
      setTitle("");
      setArtist("");
      setDescription("");
      setSelectedGenres([]);
      setSelectedInstruments([]);
      
    } catch (error) {
      console.error("Error adding video:", error);
      setUrlError("Failed to add video. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete video handler
  const handleDeleteVideo = async (videoId: string) => {
    if (!canManageVideos()) return;
    
    if (confirm("Are you sure you want to delete this video?")) {
      try {
        await deleteDocument("videos", videoId);
        setVideos(videos.filter(v => v.id !== videoId));
      } catch (error) {
        console.error("Error deleting video:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !band) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Error</h1>
          <p className="mb-6 text-gray-400">{error || "Band not found"}</p>
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

  return (
    <div className="min-h-screen text-white pb-2 md:pb-0 md:min-w-lg">
      {/* Header */}
      <div className="p-4 max-w-3xl mx-auto">
        <Link
          href={`/bands/${bandId}`}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center"
        >
          <svg className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to {band.name}
        </Link>
      </div>

      {/* Videos section */}
      <div className="px-4 mb-4 bg-gray-800/30 p-5 rounded-2xl max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">
            Band Videos - {videos.length}
          </h2>
          {canManageVideos() && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
            >
              {showAddForm ? "Cancel" : "Add Video"}
            </button>
          )}
        </div>

        {/* Add Video Form */}
        {showAddForm && canManageVideos() && (
          <div className="bg-gray-700/30 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-4">Add YouTube Video</h3>
            
            <form onSubmit={handleAddVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">YouTube URL *</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setUrlError(validateYouTubeUrl(e.target.value));
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  required
                />
                {urlError && <p className="text-red-400 text-sm mt-1">{urlError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Video title"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {allGenres.map(genre => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => {
                        setSelectedGenres(prev => 
                          prev.includes(genre) 
                            ? prev.filter(g => g !== genre)
                            : [...prev, genre]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedGenres.includes(genre)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Instruments</label>
                <div className="flex flex-wrap gap-2">
                  {allInstruments.map(instrument => (
                    <button
                      key={instrument.id}
                      type="button"
                      onClick={() => {
                        setSelectedInstruments(prev => 
                          prev.includes(instrument.id) 
                            ? prev.filter(i => i !== instrument.id)
                            : [...prev, instrument.id]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedInstruments.includes(instrument.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {instrument.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !youtubeUrl}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg transition-colors font-semibold"
                >
                  {isSubmitting ? "Adding..." : "Add Video"}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {videos.length > 0 ? (
            videos.map((video) => (
              <div key={video.id} className="relative">
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
                        const target = e.target as HTMLImageElement;
                        if (video.youtubeId && !target.src.includes('mqdefault')) {
                          target.src = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
                        } else if (video.youtubeId && !target.src.includes('default.jpg')) {
                          target.src = `https://img.youtube.com/vi/${video.youtubeId}/default.jpg`;
                        } else {
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
                            {allInstruments.find(i => i.id === instrument)?.label || instrument}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Delete button for band managers */}
                {canManageVideos() && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video.id);
                    }}
                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl mb-3">🎵</div>
              <p className="text-gray-400">No videos posted yet.</p>
              <p className="text-xs text-gray-500 mt-2">
                Add YouTube videos to showcase the band's talent
              </p>
              {canManageVideos() && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded transition-colors"
                >
                  Add Videos
                </button>
              )}
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
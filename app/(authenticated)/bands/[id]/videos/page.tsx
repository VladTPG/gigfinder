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
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [urlError, setUrlError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter state
  const [filterGenre, setFilterGenre] = useState("");
  const [filterInstrument, setFilterInstrument] = useState("");

  // Load band and videos
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch band data
        const bandData = await getBandById(bandId);
        if (!bandData) {
          setError("Band not found");
          return;
        }
        setBand(bandData);
        
        // Fetch band videos
        const bandVideos = await queryDocuments("videos", [
          { field: "bandId", operator: "==", value: bandId },
          { field: "isBandVideo", operator: "==", value: true }
        ]);
        setVideos(bandVideos as IVideo[]);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load band data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bandId]);

  // Check permissions
  const canManageVideos = (): boolean => {
    if (!band || !userProfile) return false;
    return hasPermission(band, userProfile.id, BandPermission.MANAGE_VIDEOS);
  };

  const isMember = (): boolean => {
    if (!band || !userProfile) return false;
    return band.members.some(member => member.userId === userProfile.id && member.isActive);
  };

  // Handle YouTube URL validation
  const validateYouTubeUrl = (url: string) => {
    if (!url) return "";
    if (!isValidYouTubeUrl(url)) {
      return "Please enter a valid YouTube URL";
    }
    return "";
  };

  // Handle form submission
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !band) return;

    const error = validateYouTubeUrl(youtubeUrl);
    if (error) {
      setUrlError(error);
      return;
    }

    setIsSubmitting(true);
    setUrlError("");

    try {
      const youtubeId = extractYouTubeId(youtubeUrl);
      if (!youtubeId) {
        setUrlError("Could not extract YouTube video ID");
        return;
      }

      const newVideo = {
        title: title || "Untitled Video",
        artist: band.name,
        videoUrl: youtubeUrl,
        youtubeId,
        thumbnailUrl: getYouTubeThumbnail(youtubeId),
        userId: userProfile.id,
        bandId: bandId,
        genres: selectedGenres,
        instruments: selectedInstruments,
        description,
        isYouTube: true,
        isBandVideo: true
      };

      const docRef = await addDocument("videos", newVideo);
      const videoWithId = { ...newVideo, id: docRef.id } as IVideo;
      
      // Update band's videos array
      const updatedVideos = [...band.videos, docRef.id];
      await updateDocument("bands", bandId, {
        videos: updatedVideos
      });

      // Update local state
      setVideos(prev => [videoWithId, ...prev]);
      setBand(prev => prev ? { ...prev, videos: updatedVideos } : null);
      
      // Reset form
      setYoutubeUrl("");
      setTitle("");
      setDescription("");
      setSelectedGenres([]);
      setSelectedInstruments([]);
      setShowAddForm(false);
      
    } catch (error) {
      console.error("Error adding video:", error);
      setUrlError("Failed to add video. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete video
  const handleDeleteVideo = async (videoId: string) => {
    if (!band || !userProfile) return;
    
    try {
      await deleteDocument("videos", videoId);
      
      // Update band's videos array
      const updatedVideos = band.videos.filter(id => id !== videoId);
      await updateDocument("bands", bandId, {
        videos: updatedVideos
      });
      
      // Update local state
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setBand(prev => prev ? { ...prev, videos: updatedVideos } : null);
    } catch (error) {
      console.error("Error deleting video:", error);
    }
  };

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const genreMatch = !filterGenre || video.genres.includes(filterGenre);
    const instrumentMatch = !filterInstrument || video.instruments.includes(filterInstrument);
    return genreMatch && instrumentMatch;
  });

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
          <h1 className="text-xl font-semibold mb-4">
            {error || "Band not found"}
          </h1>
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

  if (!isMember()) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You must be a band member to view this page.</p>
          <Link
            href={`/bands/${bandId}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Back to Band Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-3 md:p-4 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900/50 via-gray-800/50 to-blue-900/50 p-4 md:p-6 rounded-2xl border border-gray-700/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <div>
            <Link
              href={`/bands/${bandId}`}
              className="text-gray-400 hover:text-white mb-2 inline-flex items-center text-sm"
            >
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to {band.name}
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Band Videos ({videos.length})
            </h1>
          </div>
          
          {canManageVideos() && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
              >
                <span>🎬</span>
                {showAddForm ? "Cancel" : "Add Video"}
              </button>
              <Link
                href={`/bands/${bandId}/videos/add`}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
              >
                <span>➕</span>
                Quick Add
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Add Video Form */}
      {showAddForm && canManageVideos() && (
        <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 md:p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🎥</span>
            Add YouTube Video for {band.name}
          </h2>
          
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
                placeholder="Video title (optional)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your video..."
                rows={3}
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
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg transition-colors font-semibold"
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

      {/* Filters */}
      {videos.length > 0 && (
        <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Genre</label>
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">All Genres</option>
                {allGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Instrument</label>
              <select
                value={filterInstrument}
                onChange={(e) => setFilterInstrument(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">All Instruments</option>
                {allInstruments.map(instrument => (
                  <option key={instrument.id} value={instrument.id}>{instrument.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <div key={video.id} className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl overflow-hidden border border-gray-600/50 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
              {/* Video Thumbnail */}
              <div className="relative aspect-video bg-gray-900">
                <Image
                  src={video.youtubeId ? getYouTubeThumbnail(video.youtubeId) : video.thumbnailUrl}
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
                <h3 className="font-semibold text-base mb-2 line-clamp-2">{video.title}</h3>
                <p className="text-gray-400 text-sm mb-3">{video.artist}</p>
                
                {video.description && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">{video.description}</p>
                )}
                
                {/* Tags */}
                <div className="space-y-2">
                  {video.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.genres.map(genre => (
                        <span key={genre} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full border border-purple-500/30">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {video.instruments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.instruments.map(instrument => (
                        <span key={instrument} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full border border-blue-500/30">
                          {allInstruments.find(i => i.id === instrument)?.label || instrument}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                {canManageVideos() && (
                  <div className="mt-4 pt-3 border-t border-gray-600/50">
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Delete Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-8xl mb-6 animate-bounce">🎵</div>
          <h3 className="text-2xl font-bold mb-3 text-gray-200">
            {videos.length === 0 ? "No videos posted yet" : "No videos match your filters"}
          </h3>
          <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto leading-relaxed">
            {videos.length === 0 
              ? `Start showcasing ${band.name}'s talent by adding your first video`
              : "Try adjusting your filters to see more videos"
            }
          </p>
          {canManageVideos() && videos.length === 0 && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 inline-flex items-center gap-3"
              >
                <span className="text-xl">🎬</span>
                Add First Video
              </button>
              <Link
                href={`/bands/${bandId}/videos/add`}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 inline-flex items-center gap-3"
              >
                <span className="text-xl">➕</span>
                Quick Add Page
              </Link>
            </div>
          )}
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
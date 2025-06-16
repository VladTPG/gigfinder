"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IVideo, IBand, BandPermission } from "@/lib/types";
import { 
  getDocumentById, 
  addDocument, 
  updateDocument, 
  deleteDocument,
  queryDocuments 
} from "@/lib/firebase/firestore";
import { 
  extractYouTubeId, 
  getYouTubeThumbnail, 
  getYouTubeEmbedUrl, 
  isValidYouTubeUrl 
} from "@/lib/utils";
import { hasPermission } from "@/lib/firebase/bands";
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

export default function VideosPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  
  // State management
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [userBands, setUserBands] = useState<IBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedBandId, setSelectedBandId] = useState<string>("");
  const [urlError, setUrlError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter state
  const [filterGenre, setFilterGenre] = useState("");
  const [filterInstrument, setFilterInstrument] = useState("");

  // Load user videos and bands
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return;
      
      try {
        // Fetch user's personal videos
        const userVideos = await queryDocuments("videos", [
          { field: "userId", operator: "==", value: userProfile.id }
        ]);
        setVideos(userVideos as IVideo[]);

        // Fetch user's bands where they can manage videos
        const allBands = await queryDocuments("bands", [
          { field: "isActive", operator: "==", value: true }
        ]);
        
        const userBandsWithPermission = (allBands as IBand[]).filter(band => 
          band.members.some(member => member.userId === userProfile.id && member.isActive) &&
          hasPermission(band, userProfile.id, BandPermission.MANAGE_VIDEOS)
        );
        
        setUserBands(userBandsWithPermission);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile]);

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
    if (!userProfile) return;

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

      const selectedBand = selectedBandId ? userBands.find(b => b.id === selectedBandId) : null;
      
      const newVideo = {
        title: title || "Untitled Video",
        artist: selectedBand ? selectedBand.name : (
          userProfile.profile.firstName && userProfile.profile.lastName 
            ? `${userProfile.profile.firstName} ${userProfile.profile.lastName}`
            : userProfile.profile.username
        ),
        videoUrl: youtubeUrl,
        youtubeId,
        thumbnailUrl: getYouTubeThumbnail(youtubeId),
        userId: userProfile.id,
        bandId: selectedBandId || undefined,
        genres: selectedGenres,
        instruments: selectedInstruments,
        description,
        isYouTube: true,
        isBandVideo: !!selectedBandId
      };

      const docRef = await addDocument("videos", newVideo);
      const videoWithId = { ...newVideo, id: docRef.id } as IVideo;
      
      if (selectedBandId) {
        // Update band's videos array
        const selectedBand = userBands.find(b => b.id === selectedBandId);
        if (selectedBand) {
          await updateDocument("bands", selectedBandId, {
            videos: [...selectedBand.videos, docRef.id]
          });
        }
      } else {
        // Update user's videos array
        const currentVideos = userProfile.videos || [];
        await updateDocument("users", userProfile.id, {
          videos: [...currentVideos, docRef.id]
        });
      }

      setVideos(prev => [videoWithId, ...prev]);
      
      // Reset form
      setYoutubeUrl("");
      setTitle("");
      setDescription("");
      setSelectedGenres([]);
      setSelectedInstruments([]);
      setSelectedBandId("");
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
    if (!userProfile) return;
    
    try {
      await deleteDocument("videos", videoId);
      
      // Update user's videos array
      const updatedVideos = (userProfile.videos || []).filter(id => id !== videoId);
      await updateDocument("users", userProfile.id, {
        videos: updatedVideos
      });
      
      setVideos(prev => prev.filter(v => v.id !== videoId));
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

  if (!userProfile) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <p>Please log in to manage your videos.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-2 inline-flex items-center"
          >
            <svg className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Profile
          </button>
          <h1 className="text-2xl font-bold">My Videos ({videos.length})</h1>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
        >
          {showAddForm ? "Cancel" : "Add Video"}
        </button>
      </div>

      {/* Add Video Form */}
      {showAddForm && (
        <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add YouTube Video</h2>
          
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

            {/* Band Selection */}
            {userBands.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload for Band (optional)
                </label>
                <select
                  value={selectedBandId}
                  onChange={(e) => setSelectedBandId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Personal Video</option>
                  {userBands.map(band => (
                    <option key={band.id} value={band.id}>
                      {band.name}
                    </option>
                  ))}
                </select>
                <p className="text-gray-500 text-sm mt-1">
                  Choose a band to upload this video for that band instead of your personal profile
                </p>
              </div>
            )}

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
                        ? 'bg-purple-600 text-white'
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
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg transition-colors"
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
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-gray-400 text-sm">{video.artist}</p>
                  {video.isBandVideo && (
                    <span className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full border border-blue-500/30">
                      Band
                    </span>
                  )}
                </div>
                
                {video.description && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">{video.description}</p>
                )}
                
                {/* Tags */}
                <div className="space-y-2">
                  {video.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.genres.map(genre => (
                        <span key={genre} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {video.instruments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.instruments.map(instrument => (
                        <span key={instrument} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded">
                          {allInstruments.find(i => i.id === instrument)?.label || instrument}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center mt-4">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    View on YouTube
                  </a>
                  
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
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
              ? "Add your first YouTube video to showcase your talent"
              : "Try adjusting your filters to see more videos"
            }
          </p>
          {videos.length === 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors"
            >
              Add Your First Video
            </button>
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
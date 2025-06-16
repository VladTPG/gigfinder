"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IBand, BandPermission } from "@/lib/types";
import { getBandById, hasPermission } from "@/lib/firebase/bands";
import { addDocument, updateDocument } from "@/lib/firebase/firestore";
import { 
  extractYouTubeId, 
  getYouTubeThumbnail, 
  isValidYouTubeUrl 
} from "@/lib/utils";

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

export default function AddBandVideoPage({
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [urlError, setUrlError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load band data
  useEffect(() => {
    const fetchBand = async () => {
      try {
        const bandData = await getBandById(bandId);
        if (!bandData) {
          setError("Band not found");
          return;
        }
        setBand(bandData);
        
        // Pre-populate genres from band
        if (bandData.genres.length > 0) {
          setSelectedGenres(bandData.genres);
        }
        
      } catch (err) {
        console.error("Error fetching band:", err);
        setError("Failed to load band data");
      } finally {
        setLoading(false);
      }
    };

    fetchBand();
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
  const handleSubmit = async (e: React.FormEvent) => {
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
        isBandVideo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDocument("videos", newVideo);
      
      // Update band's videos array
      const updatedVideos = [...band.videos, docRef.id];
      await updateDocument("bands", bandId, {
        videos: updatedVideos
      });

      // Redirect to band videos page
      router.push(`/bands/${bandId}/videos`);
      
    } catch (error) {
      console.error("Error adding video:", error);
      setUrlError("Failed to add video. Please try again.");
    } finally {
      setIsSubmitting(false);
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
          <p className="text-gray-400 mb-6">You must be a band member to access this page.</p>
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

  if (!canManageVideos()) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Permission Required</h1>
          <p className="text-gray-400 mb-6">You don't have permission to manage videos for this band.</p>
          <Link
            href={`/bands/${bandId}/videos`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Back to Videos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-3 md:p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/bands/${bandId}/videos`}
          className="text-gray-400 hover:text-white mb-2 inline-flex items-center text-sm"
        >
          <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Videos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Add Video to {band.name}
        </h1>
        <p className="text-gray-400 mt-2">Share your band's performance with the world</p>
      </div>

      {/* Form */}
      <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              YouTube URL *
              <span className="text-gray-400 font-normal ml-2">
                (Copy the URL from YouTube)
              </span>
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                setUrlError(validateYouTubeUrl(e.target.value));
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
            {urlError && <p className="text-red-400 text-sm mt-2">{urlError}</p>}
            <p className="text-gray-500 text-sm mt-2">
              Paste a YouTube video URL to add it to your band's collection
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Video Title
              <span className="text-gray-400 font-normal ml-2">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a custom title or leave blank to use YouTube title"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
              <span className="text-gray-400 font-normal ml-2">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the performance, song, or context..."
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Genres
              <span className="text-gray-400 font-normal ml-2">
                (Pre-selected from band profile)
              </span>
            </label>
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedGenres.includes(genre)
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 transform scale-105'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Instruments Featured
              <span className="text-gray-400 font-normal ml-2">
                (Select all that apply)
              </span>
            </label>
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedInstruments.includes(instrument.id)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-white'
                  }`}
                >
                  {instrument.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !youtubeUrl}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Adding Video...
                </>
              ) : (
                <>
                  <span>🎬</span>
                  Add Video to Band
                </>
              )}
            </button>
            
            <Link
              href={`/bands/${bandId}/videos`}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-xl font-semibold transition-colors flex items-center justify-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
        <h3 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
          <span>💡</span>
          Tips for Adding Videos
        </h3>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Make sure your YouTube video is public or unlisted</li>
          <li>• Choose genres that best represent this specific performance</li>
          <li>• Tag all instruments featured prominently in the video</li>
          <li>• Write a description to give context about the performance</li>
        </ul>
      </div>
    </div>
  );
} 
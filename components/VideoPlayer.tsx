"use client";

import { IVideo } from "@/lib/types";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import { X } from "lucide-react";

interface VideoPlayerProps {
  video: IVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

// Available instruments for display mapping
const instrumentLabels: Record<string, string> = {
  "guitar": "Guitar",
  "piano": "Piano", 
  "voice": "Voice",
  "bass": "Bass",
  "drums": "Drums",
  "violin": "Violin",
  "saxophone": "Saxophone",
  "trumpet": "Trumpet",
};

export default function VideoPlayer({ video, isOpen, onClose }: VideoPlayerProps) {
  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white truncate pr-4">{video.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Video Player */}
          {video.youtubeId && video.isYouTube ? (
            <div className="aspect-video mb-4 bg-black rounded overflow-hidden">
              <iframe
                src={getYouTubeEmbedUrl(video.youtubeId)}
                title={video.title}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            <div className="aspect-video mb-4 bg-black rounded overflow-hidden flex items-center justify-center">
              <p className="text-gray-400">Video player not available</p>
            </div>
          )}
          
          {/* Video Information */}
          <div className="space-y-3">
            {/* Artist */}
            <div>
              <h3 className="text-lg font-medium text-white">{video.artist}</h3>
            </div>
            
            {/* Description */}
            {video.description && (
              <div>
                <p className="text-gray-300 leading-relaxed">{video.description}</p>
              </div>
            )}
            
            {/* Tags */}
            <div className="space-y-2">
              {/* Genres */}
              {video.genres && video.genres.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {video.genres.map(genre => (
                      <span 
                        key={genre} 
                        className="px-3 py-1 bg-purple-600/30 text-purple-300 text-sm rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Instruments */}
              {video.instruments && video.instruments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Instruments</h4>
                  <div className="flex flex-wrap gap-2">
                    {video.instruments.map(instrument => (
                      <span 
                        key={instrument} 
                        className="px-3 py-1 bg-blue-600/30 text-blue-300 text-sm rounded-full"
                      >
                        {instrumentLabels[instrument] || instrument}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* External Link */}
            {video.videoUrl && (
              <div className="pt-2 border-t border-gray-700">
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                  </svg>
                  View on YouTube
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
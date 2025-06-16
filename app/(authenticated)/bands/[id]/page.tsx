"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IBand, IUser, IVideo, BandMemberRole, BandPermission } from "@/lib/types";
import { getBandById, hasPermission, applyToBand } from "@/lib/firebase/bands";
import { getDocumentById, queryDocuments } from "@/lib/firebase/firestore";
import { getYouTubeThumbnail } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BandProfilePage({
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
  const [members, setMembers] = useState<(IUser & { bandRole: string; bandInstruments: string[] })[]>([]);
  const [recentVideos, setRecentVideos] = useState<IVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Application state
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [applicationRole, setApplicationRole] = useState<BandMemberRole>(BandMemberRole.MEMBER);
  const [applicationInstruments, setApplicationInstruments] = useState<string[]>([]);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applying, setApplying] = useState(false);

  const INSTRUMENTS = [
    "Vocals", "Guitar", "Bass", "Drums", "Piano", "Keyboard", "Violin", 
    "Saxophone", "Trumpet", "Flute", "Cello", "Clarinet", "Trombone", 
    "Harmonica", "Banjo", "Mandolin", "Ukulele", "Harp", "Accordion", "Other"
  ];

  // Load band data
  useEffect(() => {
    const fetchBandData = async () => {
      try {
        const bandData = await getBandById(bandId);
        
        if (!bandData) {
          setError("Band not found");
          return;
        }
        
        setBand(bandData);
        
        // Fetch member details
        const memberPromises = bandData.members
          .filter(member => member.isActive)
          .map(async (member) => {
            const userData = await getDocumentById<IUser>("users", member.userId);
            return userData ? {
              ...userData,
              bandRole: member.role,
              bandInstruments: member.instruments
            } : null;
          });
        
        const memberResults = await Promise.all(memberPromises);
        setMembers(memberResults.filter(Boolean) as any[]);
        
        // Fetch recent band videos (limit to 3 for preview)
        if (bandData.videos.length > 0) {
          const bandVideos = await queryDocuments("videos", [
            { field: "bandId", operator: "==", value: bandId },
            { field: "isBandVideo", operator: "==", value: true }
          ]);
          setRecentVideos((bandVideos as IVideo[]).slice(0, 3));
        }
        
      } catch (err) {
        console.error("Error fetching band data:", err);
        setError("Failed to load band data");
      } finally {
        setLoading(false);
      }
    };

    fetchBandData();
  }, [bandId]);

  // Check if current user can manage the band
  const canManage = (permission: BandPermission): boolean => {
    if (!band || !userProfile) return false;
    return hasPermission(band, userProfile.id, permission);
  };

  // Check if user is a member
  const isMember = (): boolean => {
    if (!band || !userProfile) return false;
    return band.members.some(member => member.userId === userProfile.id && member.isActive);
  };

  // Handle band application
  const handleApplyToBand = async () => {
    if (!userProfile || !band || applicationInstruments.length === 0) {
      alert("Please select at least one instrument");
      return;
    }

    try {
      setApplying(true);
      await applyToBand(
        bandId,
        userProfile.id,
        applicationRole,
        applicationInstruments,
        applicationMessage || undefined
      );
      
      alert("Application submitted successfully!");
      setShowApplicationDialog(false);
      resetApplicationForm();
    } catch (error: any) {
      console.error("Error applying to band:", error);
      alert(error.message || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  const resetApplicationForm = () => {
    setApplicationRole(BandMemberRole.MEMBER);
    setApplicationInstruments([]);
    setApplicationMessage("");
  };

  const toggleInstrument = (instrument: string) => {
    setApplicationInstruments(prev => 
      prev.includes(instrument)
        ? prev.filter(i => i !== instrument)
        : [...prev, instrument]
    );
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

  return (
    <div className="min-h-screen text-white p-3 md:p-4 max-w-6xl mx-auto space-y-6">
      {/* Band Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/50 via-gray-800/50 to-blue-900/50 p-4 md:p-6 rounded-2xl border border-gray-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10"></div>
        <div className="relative flex flex-col lg:flex-row gap-6">
          {/* Band Image */}
          <div className="w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-600/50">
            {band.profilePicture ? (
              <Image
                src={band.profilePicture}
                alt={band.name}
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-4xl md:text-5xl">🎵</div>
            )}
          </div>
          
          {/* Band Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 break-words">
                  {band.name}
                </h1>
                {band.location && (
                  <div className="flex items-center gap-2 text-gray-300 mb-3">
                    <span className="text-lg">📍</span>
                    <p className="text-base">{band.location}</p>
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {isMember() ? (
                  <>
                    {canManage(BandPermission.MANAGE_PROFILE) && (
                      <Link
                        href={`/bands/${bandId}/edit`}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
                      >
                        <span>✏️</span>
                        Edit Band
                      </Link>
                    )}
                    {canManage(BandPermission.MANAGE_MEMBERS) && (
                      <Link
                        href={`/bands/${bandId}/members`}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
                      >
                        <span>👥</span>
                        Manage Members
                      </Link>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setShowApplicationDialog(true)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center gap-2 text-white"
                  >
                    <span>🎵</span>
                    Apply to Join
                  </button>
                )}
              </div>
            </div>
            
            {band.bio && (
              <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-600/30 mb-4">
                <p className="text-gray-200 leading-relaxed break-words whitespace-pre-wrap text-sm">{band.bio}</p>
              </div>
            )}
            
            {/* Genres */}
            {band.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {band.genres.map(genre => (
                  <span key={genre} className="px-3 py-1 bg-purple-600/30 text-purple-300 text-sm rounded-full border border-purple-500/30 font-medium">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            {/* Stats */}
            <div className="flex flex-wrap gap-6 text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <span className="font-semibold">{members.length}</span>
                <span className="text-gray-400 text-sm">members</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎥</span>
                <span className="font-semibold">{band.videos.length}</span>
                <span className="text-gray-400 text-sm">videos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">❤️</span>
                <span className="font-semibold">{band.followers.length}</span>
                <span className="text-gray-400 text-sm">followers</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Social Links */}
        {band.socialLinks && Object.keys(band.socialLinks).length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-600/50">
            <h3 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">🔗</span>
              Find us on:
            </h3>
            <div className="flex flex-wrap gap-2">
              {band.socialLinks.website && (
                <a
                  href={band.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-blue-500/30"
                >
                  🌐 Website
                </a>
              )}
              {band.socialLinks.instagram && (
                <a
                  href={`https://instagram.com/${band.socialLinks.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 hover:text-pink-200 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-pink-500/30"
                >
                  📷 Instagram
                </a>
              )}
              {band.socialLinks.facebook && (
                <a
                  href={band.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-700/20 hover:bg-blue-700/30 text-blue-300 hover:text-blue-200 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-blue-600/30"
                >
                  📘 Facebook
                </a>
              )}
              {band.socialLinks.spotify && (
                <a
                  href={band.socialLinks.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600/20 hover:bg-green-600/30 text-green-300 hover:text-green-200 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-green-500/30"
                >
                  🎵 Spotify
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 md:p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-xl">👥</span>
            <h2 className="text-xl font-bold">Band Members</h2>
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold">
              {members.length}
            </span>
          </div>
          {canManage(BandPermission.MANAGE_MEMBERS) && (
            <Link
              href={`/bands/${bandId}/invite`}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center gap-2 w-fit"
            >
              <span>➕</span>
              Invite Member
            </Link>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((member, index) => (
            <div 
              key={member.id} 
              className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-500/50">
                  {member.profile.profilePicture ? (
                    <Image
                      src={member.profile.profilePicture}
                      alt={member.profile.username}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-300">
                      {member.profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/musician/${member.id}`}
                    className="font-bold text-base hover:text-purple-300 transition-colors block truncate"
                  >
                    {member.profile.firstName && member.profile.lastName
                      ? `${member.profile.firstName} ${member.profile.lastName}`
                      : member.profile.username}
                  </Link>
                  <p className="text-sm text-gray-400">@{member.profile.username}</p>
                </div>
              </div>
              
              {/* Role badge */}
              <div className="mb-3">
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  member.bandRole === BandMemberRole.LEADER 
                    ? "bg-yellow-600/90 text-yellow-100 border border-yellow-400/50"
                    : member.bandRole === BandMemberRole.ADMIN
                    ? "bg-blue-600/90 text-blue-100 border border-blue-400/50"
                    : "bg-gray-600/90 text-gray-100 border border-gray-400/50"
                }`}>
                  {member.bandRole}
                </span>
              </div>
              
              {/* Instruments */}
              {member.bandInstruments.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {member.bandInstruments.map(instrument => (
                    <span key={instrument} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full border border-blue-500/30">
                      {instrument}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Videos Section */}
      <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 md:p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎥</span>
            <h2 className="text-xl font-bold">Band Videos</h2>
            <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm font-bold">
              {band.videos.length}
            </span>
          </div>
          {canManage(BandPermission.MANAGE_VIDEOS) && (
            <Link
              href={`/bands/${bandId}/videos`}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center gap-2 w-fit"
            >
              <span>🎬</span>
              Manage Videos
            </Link>
          )}
        </div>
        
        {recentVideos.length > 0 ? (
          <div>
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {recentVideos.map((video) => (
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/30 transition-colors group">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-3">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">{video.title}</h4>
                    {video.description && (
                      <p className="text-gray-400 text-xs line-clamp-2">{video.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* View All Button */}
            <div className="text-center">
              <Link
                href={`/bands/${bandId}/videos`}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 inline-flex items-center gap-2"
              >
                <span>🎥</span>
                View All {band.videos.length} Videos
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">🎵</div>
            <h3 className="text-xl font-bold mb-2 text-gray-200">No videos posted yet</h3>
            <p className="text-gray-400 mb-6 text-base max-w-md mx-auto leading-relaxed">
              Start showcasing your band's talent by adding your first video
            </p>
            {canManage(BandPermission.MANAGE_VIDEOS) && (
              <Link
                href={`/bands/${bandId}/videos/add`}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 inline-flex items-center gap-2"
              >
                <span className="text-lg">🎬</span>
                Add First Video
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Application Dialog */}
      {showApplicationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Apply to Join {band?.name}</h2>
              <button
                onClick={() => setShowApplicationDialog(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={applicationRole}
                  onChange={(e) => setApplicationRole(e.target.value as BandMemberRole)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={BandMemberRole.MEMBER}>Member</option>
                  <option value={BandMemberRole.GUEST}>Guest</option>
                </select>
              </div>

              {/* Instruments */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instruments ({applicationInstruments.length} selected)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700/50 rounded-lg border border-gray-600">
                  {INSTRUMENTS.map((instrument) => (
                    <button
                      key={instrument}
                      type="button"
                      onClick={() => toggleInstrument(instrument)}
                      className={`p-2 text-xs rounded-md border transition-colors ${
                        applicationInstruments.includes(instrument)
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500"
                      }`}
                    >
                      {instrument}
                    </button>
                  ))}
                </div>
                {applicationInstruments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {applicationInstruments.map((instrument) => (
                      <span key={instrument} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full border border-purple-500/30">
                        {instrument}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message (Optional)</label>
                <textarea
                  placeholder="Tell the band why you'd like to join..."
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleApplyToBand}
                  disabled={applicationInstruments.length === 0 || applying}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span>📝</span>
                      Submit Application
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowApplicationDialog(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-3 rounded-lg font-semibold text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
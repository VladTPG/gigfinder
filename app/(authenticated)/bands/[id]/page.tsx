"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IBand, IUser, IVideo, BandMemberRole, BandPermission, IGig } from "@/lib/types";
import { getBandById, hasPermission, applyToBand } from "@/lib/firebase/bands";
import { getDocumentById, queryDocuments } from "@/lib/firebase/firestore";
import { getAcceptedGigs } from "@/lib/firebase/gigs";
import { getYouTubeThumbnail } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FollowButton } from "@/components/ui/follow-button";
import VideoPlayer from "@/components/VideoPlayer";

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
  const [acceptedGigs, setAcceptedGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  
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
        const validMembers = memberResults.filter(Boolean) as any[];
        
        // Debug logging to check band and member data
        console.log("Band data:", {
          id: bandData.id,
          name: bandData.name,
          profilePicture: bandData.profilePicture,
          hasProfilePicture: !!bandData.profilePicture
        });
        console.log("Band members data:", validMembers.map(member => ({
          id: member.id,
          username: member.profile.username,
          profilePicture: member.profile.profilePicture,
          hasProfilePicture: !!member.profile.profilePicture
        })));
        
        setMembers(validMembers);
        
        // Fetch recent band videos (limit to 3 for preview)
        if (bandData.videos.length > 0) {
          const bandVideos = await queryDocuments("videos", [
            { field: "bandId", operator: "==", value: bandId },
            { field: "isBandVideo", operator: "==", value: true }
          ]);
          setRecentVideos((bandVideos as IVideo[]).slice(0, 3));
        }
        
        // Fetch accepted gigs for this band
        const gigs = await getAcceptedGigs(bandId);
        setAcceptedGigs(gigs);
        
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
      <div className="min-h-screen text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !band) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-lg sm:text-xl font-semibold mb-4">
            {error || "Band not found"}
          </h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors min-h-[44px] touch-manipulation"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-3 md:p-4 max-w-7xl mx-auto space-y-6">
        {/* Band Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/50 via-gray-800/50 to-blue-900/50 p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10"></div>
          <div className="relative flex flex-col sm:flex-row lg:flex-row gap-4 sm:gap-6">
            {/* Band Image */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-600/50 mx-auto sm:mx-0">
              {band.profilePicture ? (
                <Image
                  src={band.profilePicture}
                  alt={band.name}
                  width={144}
                  height={144}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("Error loading band profile picture:", band.profilePicture);
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite error loop
                    target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log("Band profile picture loaded successfully:", band.profilePicture);
                  }}
                />
              ) : (
                <div className="text-3xl sm:text-4xl lg:text-5xl">🎵</div>
              )}
            </div>
            
            {/* Band Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 break-words leading-tight">
                    {band.name}
                  </h1>
                  {band.location && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-300 mb-3">
                      <span className="text-base sm:text-lg">📍</span>
                      <p className="text-sm sm:text-base">{band.location}</p>
                    </div>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                  {isMember() ? (
                    <>

                      {canManage(BandPermission.MANAGE_MEMBERS) && (
                        <Link
                          href={`/bands/${bandId}/members`}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 flex items-center gap-2 min-h-[44px] touch-manipulation"
                        >
                          <span>👥</span>
                          <span className="hidden xs:inline">Manage Members</span>
                          <span className="xs:hidden">Members</span>
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <FollowButton
                        targetId={bandId}
                        targetType="band"
                        targetName={band.name}
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] touch-manipulation"
                      />
                      <button
                        onClick={() => setShowApplicationDialog(true)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center gap-2 text-white min-h-[44px] touch-manipulation"
                      >
                        <span>🎵</span>
                        <span className="hidden xs:inline">Apply to Join</span>
                        <span className="xs:hidden">Apply</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {band.bio && (
                <div className="bg-gray-800/30 p-3 sm:p-4 rounded-xl border border-gray-600/30 mb-4 max-w-sm mx-auto">
                  <p className="text-gray-200 leading-relaxed break-words whitespace-pre-wrap text-sm sm:text-base">{band.bio}</p>
                </div>
              )}
              
              {/* Genres */}
              {band.genres.length > 0 && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                  {band.genres.map(genre => (
                    <span key={genre} className="px-2 sm:px-3 py-1 bg-purple-600/30 text-purple-300 text-xs sm:text-sm rounded-full border border-purple-500/30 font-medium">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Stats */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">👥</span>
                  <span className="font-semibold text-sm sm:text-base">{members.length}</span>
                  <span className="text-gray-400 text-xs sm:text-sm">members</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">🎥</span>
                  <span className="font-semibold text-sm sm:text-base">{band.videos.length}</span>
                  <span className="text-gray-400 text-xs sm:text-sm">videos</span>
                </div>
                <button 
                  className="flex items-center gap-2 hover:text-purple-300 transition-colors"
                  onClick={() => {
                    // TODO: Open followers modal or navigate to followers page
                    console.log("Show followers");
                  }}
                >
                  <span className="text-base sm:text-lg">❤️</span>
                  <span className="font-semibold text-sm sm:text-base">{band.followers.length}</span>
                  <span className="text-gray-400 text-xs sm:text-sm">followers</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Social Links */}
          {band.socialLinks && Object.keys(band.socialLinks).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-600/50">
              <h3 className="text-sm sm:text-base font-semibold text-gray-300 mb-3 flex items-center justify-center sm:justify-start gap-2">
                <span className="text-base sm:text-lg">🔗</span>
                Find us on:
              </h3>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {band.socialLinks.website && (
                  <a
                    href={band.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-blue-500/30 min-h-[44px] touch-manipulation"
                  >
                    🌐 Website
                  </a>
                )}
                {band.socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${band.socialLinks.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 hover:text-pink-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-pink-500/30 min-h-[44px] touch-manipulation"
                  >
                    📷 Instagram
                  </a>
                )}
                {band.socialLinks.facebook && (
                  <a
                    href={band.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-700/20 hover:bg-blue-700/30 text-blue-300 hover:text-blue-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-blue-600/30 min-h-[44px] touch-manipulation"
                  >
                    📘 Facebook
                  </a>
                )}
                {band.socialLinks.spotify && (
                  <a
                    href={band.socialLinks.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600/20 hover:bg-green-600/30 text-green-300 hover:text-green-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-green-500/30 min-h-[44px] touch-manipulation"
                  >
                    🎵 Spotify
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <span className="text-lg sm:text-xl">👥</span>
              <h2 className="text-lg sm:text-xl font-bold">Band Members</h2>
              <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs sm:text-sm font-bold">
                {members.length}
              </span>
            </div>
            {canManage(BandPermission.MANAGE_MEMBERS) && (
              <Link
                href={`/bands/${bandId}/invite`}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center gap-2 w-fit mx-auto sm:mx-0 min-h-[44px] touch-manipulation"
              >
                <span>➕</span>
                <span className="hidden xs:inline">Invite Member</span>
                <span className="xs:hidden">Invite</span>
              </Link>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {members.map((member, index) => (
              <div 
                key={member.id} 
                className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 p-3 sm:p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-500/50 flex-shrink-0">
                    {member.profile.profilePicture ? (
                      <Image
                        src={member.profile.profilePicture}
                        alt={member.profile.username}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to avatar on error
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Prevent infinite error loop
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            member.profile.username
                          )}&background=6D28D9&color=fff`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm sm:text-lg font-bold text-gray-300">
                        {member.profile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/musician/${member.id}`}
                      className="font-bold text-sm sm:text-base hover:text-purple-300 transition-colors block truncate"
                    >
                      {member.profile.firstName && member.profile.lastName
                        ? `${member.profile.firstName} ${member.profile.lastName}`
                        : member.profile.username}
                    </Link>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">@{member.profile.username}</p>
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
                    {member.bandInstruments.slice(0, 3).map(instrument => (
                      <span key={instrument} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full border border-blue-500/30">
                        {instrument}
                      </span>
                    ))}
                    {member.bandInstruments.length > 3 && (
                      <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full border border-gray-500/30">
                        +{member.bandInstruments.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Videos Section */}
        <div className="bg-gray-800/30 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              Band Videos - {band.videos.length}
            </h2>
            <Link
              href={`/bands/${bandId}/videos`}
              className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
            >
              View all
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {recentVideos.length > 0 ? (
              recentVideos.map((video) => (
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
                <p className="text-gray-400">No videos posted yet.</p>
                <p className="text-xs text-gray-500 mt-2">
                  Add YouTube videos to showcase the band's talent
                </p>
                {canManage(BandPermission.MANAGE_VIDEOS) && (
                  <Link
                    href={`/bands/${bandId}/videos`}
                    className="mt-3 text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded transition-colors"
                  >
                    Add Videos
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Accepted Gigs section */}
        <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <span className="text-lg sm:text-xl">🎤</span>
              <h2 className="text-lg sm:text-xl font-bold">Upcoming Gigs</h2>
              <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs sm:text-sm font-bold">
                {acceptedGigs.length}
              </span>
            </div>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
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
                    className="flex items-center p-3 sm:p-4 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl border border-gray-600/50 hover:border-green-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/20"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-600/20 rounded-xl flex flex-col items-center justify-center mr-3 sm:mr-4 flex-shrink-0 border border-green-500/30">
                      <span className="text-lg sm:text-xl font-bold text-green-400">{dateInfo.day}</span>
                      <span className="text-xs text-green-300">{dateInfo.month}</span>
                      <span className="text-xs text-green-300">{dateInfo.year}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-white truncate text-sm sm:text-base">{gig.title}</h3>
                      <p className="text-sm text-gray-400 truncate">{gig.venueName}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{formatTime(gig.startTime)} - {formatTime(gig.endTime)}</span>
                        {gig.paymentAmount && (
                          <span>${gig.paymentAmount} {gig.paymentCurrency}</span>
                        )}
                      </div>
                      {gig.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {gig.genres.slice(0, 3).map((genre: string) => (
                            <span key={genre} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full border border-blue-500/30">
                              {genre}
                            </span>
                          ))}
                          {gig.genres.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full border border-gray-500/30">
                              +{gig.genres.length - 3}
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
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-4">🎤</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-200">No upcoming gigs</h3>
                <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed px-4">
                  This band hasn&apos;t been accepted to any gigs yet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Application Dialog */}
        {showApplicationDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-white pr-4">Apply to Join {band?.name}</h2>
                <button
                  onClick={() => setShowApplicationDialog(false)}
                  className="text-gray-400 hover:text-white text-2xl sm:text-3xl flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors touch-manipulation"
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
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
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
                        className={`p-2 sm:p-3 text-xs rounded-md border transition-colors min-h-[44px] touch-manipulation ${
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
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleApplyToBand}
                    disabled={applicationInstruments.length === 0 || applying}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] touch-manipulation"
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
                    className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-3 rounded-lg font-semibold text-white transition-colors text-sm sm:text-base min-h-[44px] touch-manipulation"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
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
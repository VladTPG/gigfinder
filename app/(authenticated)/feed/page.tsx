"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IUser, IBand, IVideo, IGig, IVenue, GigStatus } from "@/lib/types";
import { queryDocuments, getDocumentById } from "@/lib/firebase/firestore";
import { getYouTubeThumbnail } from "@/lib/utils";
import VideoPlayer from "@/components/VideoPlayer";
import { FollowButton } from "@/components/ui/follow-button";

interface FeedItem {
  id: string;
  type: 'video' | 'band' | 'gig' | 'user_activity';
  timestamp: Date;
  content: any;
  user?: IUser;
  band?: IBand;
}

export default function FeedPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  // State management
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [recommendedBands, setRecommendedBands] = useState<IBand[]>([]);
  const [recommendedMusicians, setRecommendedMusicians] = useState<IUser[]>([]);
  const [recentGigs, setRecentGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'bands' | 'gigs'>('all');

  // Load feed data
  useEffect(() => {
    const loadFeedData = async () => {
      if (!userProfile) return;
      
      try {
        // Load recent videos from followed users/bands
        const recentVideos = await queryDocuments("videos", []);
        
        // Load recent bands
        const bands = await queryDocuments("bands", []);
        
        // Load recent gigs (published and in the future)
        const currentDate = new Date();
        const gigs = await queryDocuments("gigs", [
          { field: "status", operator: "==", value: GigStatus.PUBLISHED },
          { field: "date", operator: ">=", value: currentDate }
        ]);
        
        // Filter out user's own content and create feed items
        const videoFeedItems: FeedItem[] = (recentVideos as IVideo[])
          .filter(video => video.userId !== userProfile.id) // Exclude user's own videos
          .slice(0, 10)
          .map(video => ({
            id: `video-${video.id}`,
            type: 'video',
            timestamp: video.createdAt && typeof video.createdAt === 'object' && 'toDate' in video.createdAt 
              ? (video.createdAt as any).toDate() 
              : new Date(),
            content: video
          }));
        
        // Filter out bands where user is a member
        const bandFeedItems: FeedItem[] = (bands as IBand[])
          .filter(band => !band.members.some(member => member.userId === userProfile.id && member.isActive))
          .slice(0, 3)
          .map(band => ({
            id: `band-${band.id}`,
            type: 'band',
            timestamp: band.createdAt && typeof band.createdAt === 'object' && 'toDate' in band.createdAt 
              ? (band.createdAt as any).toDate() 
              : new Date(),
            content: band
          }));
        
        // Create gig feed items
        const gigFeedItems: FeedItem[] = (gigs as IGig[])
          .slice(0, 5)
          .map(gig => ({
            id: `gig-${gig.id}`,
            type: 'gig',
            timestamp: gig.createdAt && typeof gig.createdAt === 'object' && 'toDate' in gig.createdAt 
              ? (gig.createdAt as any).toDate() 
              : new Date(),
            content: gig
          }));
        
        // Combine and sort feed items
        const allFeedItems = [...videoFeedItems, ...bandFeedItems, ...gigFeedItems]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setFeedItems(allFeedItems);
        
        // Filter recommended bands to exclude user's own bands
        const filteredRecommendedBands = (bands as IBand[])
          .filter(band => !band.members.some(member => member.userId === userProfile.id && member.isActive))
          .slice(0, 4);
        setRecommendedBands(filteredRecommendedBands);
        
        // Sort gigs by date and take the first 5
        const sortedGigs = (gigs as IGig[])
          .sort((a, b) => {
            const dateA = convertToDate(a.date);
            const dateB = convertToDate(b.date);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);
        setRecentGigs(sortedGigs);
        
        // Load recommended musicians
        const musicians = await queryDocuments("users", [
          { field: "role", operator: "==", value: "musician" }
        ]);
        setRecommendedMusicians((musicians as IUser[]).slice(0, 4));
        
      } catch (error) {
        console.error("Error loading feed data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFeedData();
  }, [userProfile]);

  // Filter feed items based on active tab
  const filteredFeedItems = feedItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'videos') return item.type === 'video';
    if (activeTab === 'bands') return item.type === 'band';
    if (activeTab === 'gigs') return item.type === 'gig';
    return false;
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Helper function to safely convert dates from Firestore to Date object
  const convertToDate = (date: any): Date => {
    try {
      if (!date) return new Date();
      
      if (date instanceof Date) {
        return date;
      } else if (typeof date === 'object' && 'toDate' in date) {
        // Firestore Timestamp
        return date.toDate();
      } else if (typeof date === 'string') {
        return new Date(date);
      } else if (typeof date === 'number') {
        return new Date(date);
      } else {
        console.warn('Unknown date format:', date);
        return new Date();
      }
    } catch (error) {
      console.error('Error converting date:', error, date);
      return new Date();
    }
  };

  // Helper function to safely format dates for display
  const safeFormatDate = (date: any): string => {
    try {
      const jsDate = convertToDate(date);
      
      // Check if the date is valid
      if (isNaN(jsDate.getTime())) {
        console.warn('Invalid date:', date);
        return 'Invalid Date';
      }
      
      return jsDate.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Date Error';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Welcome back, {userProfile?.profile.firstName || userProfile?.profile.username}!
          </h1>
        <p className="text-gray-400">Discover new music, connect with artists, and find your next gig</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feed Tabs */}
          <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'all', label: 'All', icon: '🌟' },
                { key: 'videos', label: 'Videos', icon: '🎥' },
                { key: 'bands', label: 'Bands', icon: '🎵' },
                { key: 'gigs', label: 'Gigs', icon: '🎤' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Items */}
          <div className="space-y-4">
            {filteredFeedItems.length > 0 ? (
              filteredFeedItems.map((item) => (
                <div key={item.id} className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 sm:p-6 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300">
                  {item.type === 'video' && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Video Thumbnail */}
                      <div className="w-full sm:w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden flex-shrink-0">
                        <div className="relative w-full h-full">
                          <Image
                            src={item.content.youtubeId ? getYouTubeThumbnail(item.content.youtubeId) : item.content.thumbnailUrl}
                            alt={item.content.title}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMzAgOTBMMTgwIDEyMFYxODBIMTMwVjkwWiIgZmlsbD0iI0VGNDQ0NCIvPgo8L3N2Zz4K';
                            }}
                          />
                  <button
                            onClick={() => setSelectedVideo(item.content)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/30 transition-colors group"
                          >
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                  </button>
                </div>
              </div>
                      
                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-lg line-clamp-2 pr-4">{item.content.title}</h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                        <p className="text-purple-400 font-medium mb-2">{item.content.artist}</p>
                        {item.content.description && (
                          <p className="text-gray-300 text-sm line-clamp-3 mb-3">{item.content.description}</p>
                        )}
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.content.genres?.slice(0, 3).map((genre: string) => (
                            <span key={genre} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full">
                              {genre}
                  </span>
                          ))}
                          {item.content.instruments?.slice(0, 2).map((instrument: string) => (
                            <span key={instrument} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full">
                              {instrument}
                  </span>
                          ))}
                        </div>

                      </div>
                    </div>
                  )}
                  
                  {item.type === 'band' && (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-700 flex-shrink-0">
                        {item.content.profilePicture ? (
                          <Image
                            src={item.content.profilePicture}
                            alt={item.content.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-bold text-lg">{item.content.name}</h3>
                          <span className="text-xs text-gray-400">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{item.content.location}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.content.genres?.slice(0, 3).map((genre: string) => (
                            <span key={genre} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full">
                              {genre}
                  </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/bands/${item.content.id}`}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            View Profile
                          </Link>
                          <FollowButton
                            targetId={item.content.id}
                            targetType="band"
                            targetName={item.content.name}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'gig' && (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex-shrink-0 flex items-center justify-center">
                        <span className="text-2xl">🎤</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-bold text-lg line-clamp-1">{item.content.title}</h3>
                          <span className="text-xs text-gray-400">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                        <p className="text-green-400 font-medium mb-1">{item.content.venueName}</p>
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.content.description}</p>
                        
                        {/* Gig Details */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2 py-1 bg-green-600/30 text-green-300 text-xs rounded-full">
                            {safeFormatDate(item.content.date)}
                          </span>
                          <span className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full">
                            {item.content.startTime} - {item.content.endTime}
                          </span>
                          {item.content.paymentAmount && (
                            <span className="px-2 py-1 bg-yellow-600/30 text-yellow-300 text-xs rounded-full">
                              ${item.content.paymentAmount} {item.content.paymentCurrency || 'USD'}
                            </span>
                          )}
                        </div>
                        
                        {/* Genres */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.content.genres?.slice(0, 3).map((genre: string) => (
                            <span key={genre} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full">
                              {genre}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/gigs/${item.content.id}`}
                            className="text-green-400 hover:text-green-300 text-sm font-medium"
                          >
                            View Details
                          </Link>
                          {userProfile?.role === 'musician' && (
                            <Link
                              href={`/gigs/${item.content.id}`}
                              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                            >
                              Apply Now
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-xl font-semibold mb-2">No activity yet</h3>
                <p className="text-gray-400 mb-6">Follow bands and musicians to see their latest updates</p>
                <Link
                  href="/search"
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <span>🔍</span>
                  Discover Artists
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>📊</span>
              Your Activity
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Videos</span>
                <span className="font-semibold">{userProfile?.videos?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Following</span>
                <span className="font-semibold">{userProfile?.following?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Followers</span>
                <span className="font-semibold">{userProfile?.followers?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Recommended Bands */}
          <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>🎵</span>
                Recommended Bands
              </h3>
              <Link href="/bands" className="text-purple-400 text-sm hover:text-purple-300">
                See all
              </Link>
            </div>
            <div className="space-y-3">
              {recommendedBands.map((band) => (
                <div key={band.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                    {band.profilePicture ? (
                      <Image
                        src={band.profilePicture}
                        alt={band.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/bands/${band.id}`}
                      className="font-medium hover:text-purple-400 transition-colors block truncate"
                    >
                      {band.name}
                    </Link>
                    <p className="text-xs text-gray-400 truncate">{band.location}</p>
                  </div>
                  <FollowButton
                    targetId={band.id}
                    targetType="band"
                    targetName={band.name}
                    size="sm"
                    variant="outline"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Gigs */}
          <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>🎤</span>
                Open Gigs
              </h3>
              <Link href="/gigs" className="text-purple-400 text-sm hover:text-purple-300">
                See all
              </Link>
            </div>
            <div className="space-y-3">
              {recentGigs.length > 0 ? (
                recentGigs.slice(0, 3).map((gig) => (
                  <Link
                    key={gig.id}
                    href={`/gigs/${gig.id}`}
                    className="block p-3 bg-gray-700/30 rounded-lg hover:bg-gray-600/30 transition-colors"
                  >
                    <h4 className="font-medium text-sm line-clamp-1 mb-1">{gig.title}</h4>
                    <p className="text-xs text-gray-400 mb-1">{gig.venueName}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-green-400">
                        {gig.paymentAmount ? `$${gig.paymentAmount} ${gig.paymentCurrency || 'USD'}` : 'Payment TBD'}
                      </span>
                                          <span className="text-xs text-gray-500">
                      {safeFormatDate(gig.date)}
                    </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  <div className="text-2xl mb-2">🎤</div>
                  <p>No open gigs available</p>
                  <Link href="/gigs" className="text-purple-400 hover:text-purple-300 text-xs">
                    Browse all gigs
                  </Link>
                </div>
              )}
            </div>
          </div>
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

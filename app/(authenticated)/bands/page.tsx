"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  IBand, 
  IBandInvitation, 
  BandMemberRole,
  InvitationStatus 
} from "@/lib/types";
import { 
  getUserBands, 
  getUserInvitations,
  acceptBandInvitation,
  declineBandInvitation,
  searchBands 
} from "@/lib/firebase/bands";
import { queryDocuments } from "@/lib/firebase/firestore";

// Available genres for filtering
const allGenres = [
  "Rock", "Pop", "Jazz", "Blues", "Classical", "Electronic", 
  "Hip Hop", "R&B", "Country", "Folk", "Metal", "Punk", 
  "Reggae", "Soul", "Funk", "Alternative", "Indie", 
  "Experimental", "World", "Latin"
];

export default function BandsPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  
  // State management
  const [userBands, setUserBands] = useState<IBand[]>([]);
  const [invitations, setInvitations] = useState<IBandInvitation[]>([]);
  const [discoverBands, setDiscoverBands] = useState<IBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Discover functionality state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load user's bands and invitations
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return;
      
      try {
        const [bands, pendingInvitations] = await Promise.all([
          getUserBands(userProfile.id),
          getUserInvitations(userProfile.id)
        ]);
        
        setUserBands(bands);
        setInvitations(pendingInvitations);
        
        // Load initial discover bands (recent active bands)
        await loadDiscoverBands();
      } catch (err) {
        console.error("Error fetching bands data:", err);
        setError("Failed to load bands data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile]);

  // Reload discover bands when user bands change
  useEffect(() => {
    if (userBands.length > 0) {
      loadDiscoverBands();
    }
  }, [userBands]);

  // Load discover bands
  const loadDiscoverBands = async (search?: string, genres?: string[]) => {
    if (!userProfile) return;
    
    setDiscoverLoading(true);
    try {
      let bands: IBand[] = [];
      
      if (search || (genres && genres.length > 0)) {
        // Use search function if there are search criteria
        bands = await searchBands(search || "", genres);
      } else {
        // Load recent active bands
        const allBands = await queryDocuments("bands", [
          { field: "isActive", operator: "==", value: true }
        ]);
        bands = (allBands as IBand[])
          .filter(band => !userBands.some(userBand => userBand.id === band.id)) // Exclude user's bands
          .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
          .slice(0, 6); // Limit to 6 for preview
      }
      
      // Filter out user's own bands
      const filteredBands = bands.filter(band => 
        !userBands.some(userBand => userBand.id === band.id)
      );
      
      setDiscoverBands(filteredBands);
    } catch (err) {
      console.error("Error loading discover bands:", err);
    } finally {
      setDiscoverLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    await loadDiscoverBands(searchTerm, selectedGenres);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedGenres([]);
    loadDiscoverBands();
  };

  // Handle invitation response
  const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
    try {
      if (accept) {
        await acceptBandInvitation(invitationId);
        // Refresh data
        if (userProfile) {
          const [bands, pendingInvitations] = await Promise.all([
            getUserBands(userProfile.id),
            getUserInvitations(userProfile.id)
          ]);
          setUserBands(bands);
          setInvitations(pendingInvitations);
        }
      } else {
        await declineBandInvitation(invitationId);
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      }
    } catch (err) {
      console.error("Error handling invitation:", err);
      setError("Failed to process invitation");
    }
  };

  // Get user's role in a band
  const getUserRole = (band: IBand): string => {
    if (!userProfile) return "";
    const member = band.members.find(m => m.userId === userProfile.id && m.isActive);
    return member ? member.role : "";
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <p>Please log in to view your bands.</p>
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
    <div className="min-h-screen text-white p-3 md:p-4 max-w-7xl mx-auto space-y-6">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/50 via-gray-800/50 to-blue-900/50 p-4 md:p-6 rounded-2xl border border-gray-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10"></div>
        <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              My Bands
            </h1>
            <p className="text-gray-300 text-lg">
              Manage your musical collaborations and discover new opportunities
            </p>
          </div>
          <Link
            href="/bands/create"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center gap-2 w-fit"
          >
            <span className="text-xl">🎸</span>
            Create Band
          </Link>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-600/20 border border-red-500/50 text-red-300 p-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-900/20 via-gray-800/50 to-orange-900/20 p-6 rounded-2xl border border-yellow-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📬</span>
            <h2 className="text-2xl font-bold text-yellow-300">Pending Invitations</h2>
            <span className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-sm font-bold">
              {invitations.length}
            </span>
          </div>
          <div className="space-y-4">
            {invitations.map((invitation, index) => (
              <div 
                key={invitation.id} 
                className="bg-gray-800/60 p-5 rounded-xl border border-gray-600/50 hover:border-yellow-500/50 transition-all duration-300 transform hover:scale-[1.02]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-yellow-300">{invitation.bandName}</h3>
                      <span className="text-2xl">🎵</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-2">
                      <span className="flex items-center gap-1">
                        <span className="text-blue-400">👤</span>
                        Role: <span className="font-semibold text-blue-300">{invitation.role}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-green-400">🎼</span>
                        Instruments: <span className="font-semibold text-green-300">{invitation.instruments.join(", ")}</span>
                      </span>
                    </div>
                    {invitation.message && (
                      <div className="bg-gray-700/50 p-3 rounded-lg mt-3 border-l-4 border-yellow-500">
                        <p className="text-gray-200 italic">"{invitation.message}"</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, true)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
                    >
                      <span>✅</span>
                      Accept
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, false)}
                      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 flex items-center gap-2"
                    >
                      <span>❌</span>
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User's Bands */}
      <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🎸</span>
          <h2 className="text-2xl font-bold">
            Your Bands
          </h2>
          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            {userBands.length}
          </span>
        </div>
        
        {userBands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userBands.map((band, index) => (
              <Link
                key={band.id}
                href={`/bands/${band.id}`}
                className="group bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl overflow-hidden hover:from-gray-600/50 hover:to-gray-700/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 border border-gray-600/50 hover:border-purple-500/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Band Image */}
                <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
                  {band.profilePicture ? (
                    <Image
                      src={band.profilePicture}
                      alt={band.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-blue-900/30">
                      <div className="text-5xl group-hover:scale-110 transition-transform duration-300">🎵</div>
                    </div>
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* Role badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm border ${
                      getUserRole(band) === BandMemberRole.LEADER 
                        ? "bg-yellow-600/90 text-yellow-100 border-yellow-400/50"
                        : getUserRole(band) === BandMemberRole.ADMIN
                        ? "bg-blue-600/90 text-blue-100 border-blue-400/50"
                        : "bg-gray-600/90 text-gray-100 border-gray-400/50"
                    }`}>
                      {getUserRole(band)}
                    </span>
                  </div>
                </div>
                
                {/* Band Info */}
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-3 group-hover:text-purple-300 transition-colors line-clamp-1">
                    {band.name}
                  </h3>
                  
                  {band.bio && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {band.bio}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="text-blue-400">👥</span>
                      {band.members.filter(m => m.isActive).length} members
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-red-400">🎥</span>
                      {band.videos.length} videos
                    </span>
                  </div>
                  
                  {/* Genres */}
                  {band.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {band.genres.slice(0, 3).map(genre => (
                        <span key={genre} className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full border border-purple-500/30">
                          {genre}
                        </span>
                      ))}
                      {band.genres.length > 3 && (
                        <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full border border-gray-500/30">
                          +{band.genres.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-8xl mb-6 animate-bounce">🎸</div>
            <h3 className="text-2xl font-bold mb-3 text-gray-200">No bands yet</h3>
            <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto leading-relaxed">
              Create your first band or wait for invitations from other musicians to start your musical journey
            </p>
            <Link
              href="/bands/create"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 inline-flex items-center gap-3"
            >
              <span className="text-xl">🎵</span>
              Create Your First Band
            </Link>
          </div>
        )}
      </div>

      {/* Discover Bands */}
      <div className="bg-gradient-to-br from-indigo-900/20 via-gray-800/50 to-purple-900/20 p-6 rounded-2xl border border-indigo-500/30 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <h2 className="text-2xl font-bold text-indigo-300">Discover Bands</h2>
            {discoverBands.length > 0 && (
              <span className="bg-indigo-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                {discoverBands.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <span>🎛️</span>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {/* Search and Filters */}
        {showFilters && (
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-600/50 mb-6 space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search bands by name..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={discoverLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {discoverLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <span>🔍</span>
                )}
                Search
              </button>
            </div>

            {/* Genre Filters */}
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-300">Filter by Genres</label>
              <div className="flex flex-wrap gap-2">
                {allGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => {
                      setSelectedGenres(prev => 
                        prev.includes(genre) 
                          ? prev.filter(g => g !== genre)
                          : [...prev, genre]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedGenres.includes(genre)
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 transform scale-105'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSearch}
                disabled={discoverLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Discover Results */}
        {discoverLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Discovering bands...</p>
          </div>
        ) : discoverBands.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {discoverBands.map((band, index) => (
                <Link
                  key={band.id}
                  href={`/bands/${band.id}`}
                  className="group bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl overflow-hidden hover:from-gray-600/50 hover:to-gray-700/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20 border border-gray-600/50 hover:border-indigo-500/50"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Band Image */}
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
                    {band.profilePicture ? (
                      <Image
                        src={band.profilePicture}
                        alt={band.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/30 to-purple-900/30">
                        <div className="text-5xl group-hover:scale-110 transition-transform duration-300">🎵</div>
                      </div>
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* New band indicator */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-600/90 text-green-100 border border-green-400/50 backdrop-blur-sm">
                        Discover
                      </span>
                    </div>
                  </div>
                  
                  {/* Band Info */}
                  <div className="p-5">
                    <h3 className="font-bold text-xl mb-3 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {band.name}
                    </h3>
                    
                    {band.location && (
                      <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                        <span>📍</span>
                        <span>{band.location}</span>
                      </div>
                    )}
                    
                    {band.bio && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {band.bio}
                      </p>
                    )}
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <span className="text-blue-400">👥</span>
                        {band.members.filter(m => m.isActive).length} members
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-red-400">🎥</span>
                        {band.videos.length} videos
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-purple-400">❤️</span>
                        {band.followers.length} followers
                      </span>
                    </div>
                    
                    {/* Genres */}
                    {band.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {band.genres.slice(0, 3).map(genre => (
                          <span key={genre} className="px-2 py-1 bg-indigo-600/30 text-indigo-300 text-xs rounded-full border border-indigo-500/30">
                            {genre}
                          </span>
                        ))}
                        {band.genres.length > 3 && (
                          <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full border border-gray-500/30">
                            +{band.genres.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Load More / View All */}
            <div className="text-center">
              <button
                onClick={() => loadDiscoverBands(searchTerm, selectedGenres)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/25 inline-flex items-center gap-2"
              >
                <span>🔄</span>
                Refresh Results
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-200">
              {searchTerm || selectedGenres.length > 0 ? "No bands found" : "No bands to discover"}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || selectedGenres.length > 0 
                ? "Try adjusting your search criteria or filters"
                : "Check back later for new bands to discover"
              }
            </p>
            {(searchTerm || selectedGenres.length > 0) && (
              <button
                onClick={clearFilters}
                className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

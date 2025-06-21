"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { searchUsers } from "@/lib/firebase/users";
import { searchBands } from "@/lib/firebase/bands";
import { IUser, IBand } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/ui/follow-button";
import { Search, Music, Users, MapPin, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SearchType = "musicians" | "bands";

interface SearchState {
  musicians: IUser[];
  bands: IBand[];
  loading: boolean;
  error: string | null;
}

export default function SearchPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<SearchType>("musicians");
  const [searchState, setSearchState] = useState<SearchState>({
    musicians: [],
    bands: [],
    loading: false,
    error: null
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);

  // Save search term to recent searches
  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    
    const normalizedTerm = term.trim();
    const updated = [
      normalizedTerm,
      ...recentSearches.filter(s => s.toLowerCase() !== normalizedTerm.toLowerCase())
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  }, [recentSearches]);

  // Debounced search function
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchState(prev => ({ ...prev, musicians: [], bands: [] }));
      return;
    }

    setSearchState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [musicians, bands] = await Promise.all([
        searchUsers(term, 20),
        searchBands(term, [], 20)
      ]);

      // Filter musicians to only include those with musician role
      const filteredMusicians = musicians.filter(user => user.role === "musician");

      setSearchState({
        musicians: filteredMusicians,
        bands,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error("Search error:", error);
      setSearchState(prev => ({
        ...prev,
        loading: false,
        error: "Failed to search. Please try again."
      }));
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, performSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      saveRecentSearch(searchTerm);
      performSearch(searchTerm);
    }
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchTerm(term);
    performSearch(term);
  };

  const getDisplayName = (user: IUser) => {
    const { firstName, lastName, username } = user.profile;
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username;
  };

  const currentResults = activeTab === "musicians" ? searchState.musicians : searchState.bands;
  const hasResults = currentResults.length > 0;
  const showEmptyState = !searchState.loading && searchTerm && !hasResults;

  return (
    <div className="min-h-screen text-white p-3 md:p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-800/30 rounded-2xl p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
          Discover Musicians & Bands
        </h1>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for musicians and bands..."
              className="pl-10 h-12 text-lg bg-gray-900/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
            />
            {searchState.loading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 animate-spin" />
            )}
          </div>
        </form>

        {/* Search Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab("musicians")}
            className={cn(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors",
              activeTab === "musicians"
                ? "bg-purple-600 text-white"
                : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
            )}
          >
            <Music className="h-4 w-4" />
            Musicians ({searchState.musicians.length})
          </button>
          <button
            onClick={() => setActiveTab("bands")}
            className={cn(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors",
              activeTab === "bands"
                ? "bg-purple-600 text-white"
                : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
            )}
          >
            <Users className="h-4 w-4" />
            Bands ({searchState.bands.length})
          </button>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && !searchTerm && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Recent searches:</h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(term)}
                  className="px-3 py-1 rounded-full bg-gray-700/50 text-sm hover:bg-gray-600/50 transition-colors"
                >
                  <Clock className="inline h-3 w-3 mr-1" />
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {searchState.error && (
        <div className="bg-red-900/20 border border-red-900 text-red-300 p-4 rounded-xl">
          <p className="text-center">{searchState.error}</p>
        </div>
      )}

      {/* Empty State */}
      {showEmptyState && (
        <div className="bg-gray-800/30 p-8 rounded-2xl text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-300 mb-2">
            No {activeTab} found for "{searchTerm}"
          </p>
          <p className="text-gray-400 text-sm">
            Try a different search term or check the other tab.
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          {activeTab === "musicians" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchState.musicians.map((musician) => (
                <div
                  key={musician.id}
                  className="bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    {/* Profile Picture */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                      {musician.profile.profilePicture ? (
                        <Image
                          src={musician.profile.profilePicture}
                          alt={getDisplayName(musician)}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              getDisplayName(musician)
                            )}&background=6D28D9&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {getDisplayName(musician).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/musician/${musician.id}`}
                            className="font-semibold text-white hover:text-purple-400 transition-colors block truncate"
                          >
                            {getDisplayName(musician)}
                          </Link>
                          <p className="text-sm text-gray-400 truncate">
                            @{musician.profile.username}
                          </p>
                        </div>
                        
                        {/* Follow Button */}
                        {userProfile && userProfile.id !== musician.id && (
                          <FollowButton
                            targetId={musician.id}
                            targetType="user"
                            targetName={getDisplayName(musician)}
                            size="sm"
                            variant="outline"
                          />
                        )}
                      </div>

                      {/* Location */}
                      {musician.profile.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {musician.profile.location}
                          </span>
                        </div>
                      )}

                      {/* Bio */}
                      {musician.profile.bio && (
                        <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                          {musician.profile.bio}
                        </p>
                      )}

                      {/* Genres */}
                      {musician.profile.genres && musician.profile.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {musician.profile.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full"
                            >
                              {genre}
                            </span>
                          ))}
                          {musician.profile.genres.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                              +{musician.profile.genres.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Instruments */}
                      {musician.profile.instruments && musician.profile.instruments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {musician.profile.instruments.slice(0, 3).map((instrument) => (
                            <span
                              key={instrument}
                              className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded-full"
                            >
                              {instrument}
                            </span>
                          ))}
                          {musician.profile.instruments.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                              +{musician.profile.instruments.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "bands" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchState.bands.map((band) => (
                <div
                  key={band.id}
                  className="bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    {/* Band Picture */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                      {band.profilePicture ? (
                        <Image
                          src={band.profilePicture}
                          alt={band.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {band.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/bands/${band.id}`}
                            className="font-semibold text-white hover:text-purple-400 transition-colors block truncate"
                          >
                            {band.name}
                          </Link>
                          <p className="text-sm text-gray-400">
                            {band.members.filter(m => m.isActive).length} members
                          </p>
                        </div>
                        
                        {/* Follow Button */}
                        {userProfile && !band.members.some(m => m.userId === userProfile.id && m.isActive) && (
                          <FollowButton
                            targetId={band.id}
                            targetType="band"
                            targetName={band.name}
                            size="sm"
                            variant="outline"
                          />
                        )}
                      </div>

                      {/* Location */}
                      {band.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {band.location}
                          </span>
                        </div>
                      )}

                      {/* Bio */}
                      {band.bio && (
                        <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                          {band.bio}
                        </p>
                      )}

                      {/* Genres */}
                      {band.genres && band.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {band.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full"
                            >
                              {genre}
                            </span>
                          ))}
                          {band.genres.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full">
                              +{band.genres.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

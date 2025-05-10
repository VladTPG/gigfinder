"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { SearchIcon, MusicIcon, UsersIcon, HomeIcon } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  type: "musician" | "band" | "venue";
  description?: string;
  imageUrl?: string;
  location?: string;
  genres?: string[];
  instruments?: string[]; // For musicians
  members?: number; // For bands
  capacity?: number; // For venues
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"musician" | "band" | "venue">(
    "musician"
  );
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string[]>([]); // For debugging
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches).slice(0, 5));
      } catch (e) {
        console.error("Failed to parse recent searches", e);
      }
    }
  }, []);

  // Save a new search term to recent searches
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;

    // Normalize the search term to prevent duplicates with different casing
    const normalizedTerm = term.trim();

    // Create a new array with the current term at the beginning and filter out duplicates
    const updatedSearches = [
      normalizedTerm,
      ...recentSearches.filter(
        (s) => s.toLowerCase() !== normalizedTerm.toLowerCase()
      ),
    ].slice(0, 5);

    setRecentSearches(updatedSearches);

    try {
      localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
    } catch (e) {
      console.error("Failed to save recent searches to localStorage", e);
    }
  };

  const addDebug = (message: string) => {
    setDebug((prev) => [...prev, message]);
    console.log(message);
  };

  // Handle keyboard shortcut
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim() === "") {
      alert("Please enter a search term.");
      return;
    }

    setIsLoading(true);
    setSearchResults([]);
    setError(null);
    setDebug([`Searching for ${searchType}: ${searchTerm}`]);

    // Save this search term - moved before the search to ensure it's saved
    // even if the search fails
    saveRecentSearch(searchTerm);

    try {
      // Map the user-friendly search type to the correct collection name
      let collectionName;
      let nameField;

      // Determine the correct collection and field to search based on the type
      switch (searchType) {
        case "musician":
          // For musicians, we look in the "users" collection where role is "musician"
          collectionName = "users";
          nameField = "profile.username"; // Based on IUser interface
          break;
        case "band":
          // For bands, we look in a dedicated "bands" collection
          collectionName = "bands";
          nameField = "name"; // Assuming the field is "name" in bands collection
          break;
        case "venue":
          // For venues, we look in a dedicated "venues" collection
          collectionName = "venues";
          nameField = "name"; // Assuming the field is "name" in venues collection
          break;
      }

      const sanitizedSearchTerm = searchTerm.trim();
      addDebug(
        `Using collection: ${collectionName}, searching field: ${nameField}`
      );

      // Different search approach based on type
      if (searchType === "musician") {
        // For musicians, use a simpler query that doesn't require a composite index
        // Just get all musicians and filter client-side
        addDebug(
          "Using client-side filtering for musicians (no index required)"
        );

        const simpleQuery = query(
          collection(db, collectionName),
          where("role", "==", "musician"),
          limit(100) // Increase limit since we're filtering client-side
        );

        const querySnapshot = await getDocs(simpleQuery);
        addDebug(`Query returned ${querySnapshot.size} musicians total`);

        // Filter the results client-side for a case-insensitive search
        const results: SearchResult[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Get the username with nested path safety
          const username = data.profile?.username || "";

          // Case-insensitive includes check
          if (
            username.toLowerCase().includes(sanitizedSearchTerm.toLowerCase())
          ) {
            results.push({
              id: doc.id,
              name: username,
              type: searchType,
              description: data.profile?.bio || "",
              imageUrl: data.profile?.profilePicture || "",
              location: data.profile?.location || "",
              genres: data.profile?.genres || [],
              instruments: data.profile?.instruments || [],
            });
          }
        });

        addDebug(`Filtered to ${results.length} matching musicians`);
        setSearchResults(results);
      } else {
        // For bands and venues, use the original query
        const q = query(
          collection(db, collectionName),
          where(nameField, ">=", sanitizedSearchTerm),
          where(nameField, "<=", sanitizedSearchTerm + "\uf8ff"),
          limit(20)
        );

        addDebug(`Executing ${searchType} search query`);
        const querySnapshot = await getDocs(q);
        addDebug(`Query returned ${querySnapshot.size} results`);

        // Process regular query results
        const results: SearchResult[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const name = data.name || `Unknown ${searchType}`;

          // Build result with type-specific fields
          const result: SearchResult = {
            id: doc.id,
            name: name,
            type: searchType,
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            location: data.location || "",
            genres: data.genres || [],
          };

          // Add type-specific properties
          if (searchType === "band") {
            result.members = data.members?.length || 0;
          } else if (searchType === "venue") {
            result.capacity = data.capacity || 0;
          }

          results.push(result);
        });

        setSearchResults(results);
      }
    } catch (err: Error | unknown) {
      console.error("Error fetching search results:", err);
      addDebug(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setError(
        `Failed to fetch results: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }

    setIsLoading(false);
  };

  // Generate a placeholder avatar for results without images
  const getAvatarPlaceholder = (name: string, type: string) => {
    const colors = {
      musician: "#6D28D9", // Purple
      band: "#DB2777", // Pink
      venue: "#2563EB", // Blue
    };

    const color = colors[type as keyof typeof colors] || "#6B7280";
    const initials = name.charAt(0).toUpperCase() || "?";

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initials
    )}&background=${color.replace("#", "")}&color=fff&size=120`;
  };

  // Get icon for result type
  const getTypeIcon = (type: "musician" | "band" | "venue") => {
    switch (type) {
      case "musician":
        return <MusicIcon className="h-4 w-4" />;
      case "band":
        return <UsersIcon className="h-4 w-4" />;
      case "venue":
        return <HomeIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="bg-gray-800/30 rounded-2xl p-6 mb-6">
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
          Discover Your Music Community
        </h1>

        <div className="relative mb-6">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find musicians, bands, or venues..."
            className="pl-10 h-12 text-lg bg-gray-900/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-2">
          <div className="flex rounded-xl overflow-hidden border border-gray-700 flex-1">
            {(["musician", "band", "venue"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  // Update the search type in state
                  setSearchType(type);

                  // If there's already a search term, perform a new search with the newly selected type
                  if (searchTerm.trim()) {
                    // Create a direct search function with the new type
                    const searchWithNewType = async () => {
                      const newType = type; // Directly use the new type from the map function

                      setIsLoading(true);
                      setSearchResults([]);
                      setError(null);
                      setDebug([`Searching for ${newType}: ${searchTerm}`]);

                      try {
                        // Map the user-friendly search type to the correct collection name
                        let collectionName;
                        let nameField;

                        // Determine the correct collection and field to search based on the new type
                        switch (newType) {
                          case "musician":
                            collectionName = "users";
                            nameField = "profile.username";
                            break;
                          case "band":
                            collectionName = "bands";
                            nameField = "name";
                            break;
                          case "venue":
                            collectionName = "venues";
                            nameField = "name";
                            break;
                        }

                        const sanitizedSearchTerm = searchTerm.trim();
                        addDebug(
                          `Using collection: ${collectionName}, searching field: ${nameField}`
                        );

                        // Different search approach based on type
                        if (newType === "musician") {
                          // For musicians, use client-side filtering
                          addDebug(
                            "Using client-side filtering for musicians (no index required)"
                          );

                          const simpleQuery = query(
                            collection(db, collectionName),
                            where("role", "==", "musician"),
                            limit(100)
                          );

                          const querySnapshot = await getDocs(simpleQuery);
                          addDebug(
                            `Query returned ${querySnapshot.size} musicians total`
                          );

                          // Filter the results client-side
                          const results: SearchResult[] = [];
                          querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            const username = data.profile?.username || "";

                            // Case-insensitive includes check
                            if (
                              username
                                .toLowerCase()
                                .includes(sanitizedSearchTerm.toLowerCase())
                            ) {
                              results.push({
                                id: doc.id,
                                name: username,
                                type: newType,
                                description: data.profile?.bio || "",
                                imageUrl: data.profile?.profilePicture || "",
                                location: data.profile?.location || "",
                                genres: data.profile?.genres || [],
                                instruments: data.profile?.instruments || [],
                              });
                            }
                          });

                          addDebug(
                            `Filtered to ${results.length} matching musicians`
                          );
                          setSearchResults(results);
                        } else {
                          // For bands and venues
                          const q = query(
                            collection(db, collectionName),
                            where(nameField, ">=", sanitizedSearchTerm),
                            where(
                              nameField,
                              "<=",
                              sanitizedSearchTerm + "\uf8ff"
                            ),
                            limit(20)
                          );

                          addDebug(`Executing ${newType} search query`);
                          const querySnapshot = await getDocs(q);
                          addDebug(
                            `Query returned ${querySnapshot.size} results`
                          );

                          // Process results
                          const results: SearchResult[] = [];
                          querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            const name = data.name || `Unknown ${newType}`;

                            // Build result with type-specific fields
                            const result: SearchResult = {
                              id: doc.id,
                              name: name,
                              type: newType,
                              description: data.description || "",
                              imageUrl: data.imageUrl || "",
                              location: data.location || "",
                              genres: data.genres || [],
                            };

                            // Add type-specific properties
                            if (newType === "band") {
                              result.members = data.members?.length || 0;
                            } else if (newType === "venue") {
                              result.capacity = data.capacity || 0;
                            }

                            results.push(result);
                          });

                          setSearchResults(results);
                        }
                      } catch (err: Error | unknown) {
                        console.error("Error fetching search results:", err);
                        addDebug(
                          `Error: ${
                            err instanceof Error ? err.message : "Unknown error"
                          }`
                        );
                        setError(
                          `Failed to fetch results: ${
                            err instanceof Error ? err.message : "Unknown error"
                          }`
                        );
                      }

                      setIsLoading(false);
                    };

                    // Execute the search with the new type
                    searchWithNewType();
                  }
                }}
                className={`flex-1 py-3 px-2 capitalize flex items-center justify-center gap-2 transition-colors ${
                  searchType === type
                    ? "bg-purple-800 text-white"
                    : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
                }`}
              >
                {getTypeIcon(type)}
                {type}
              </button>
            ))}
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="h-12 min-w-[100px] bg-purple-700 hover:bg-purple-600"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Searching...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <SearchIcon className="h-4 w-4" />
                Search
              </span>
            )}
          </Button>
        </div>

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">Recent searches:</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    setSearchTerm(term);
                    // Create a custom search function that uses the term directly
                    const performSearch = async () => {
                      if (term.trim() === "") {
                        alert("Please enter a search term.");
                        return;
                      }

                      setIsLoading(true);
                      setSearchResults([]);
                      setError(null);
                      setDebug([`Searching for ${searchType}: ${term}`]);

                      // Save this search term
                      saveRecentSearch(term);

                      try {
                        // Map the user-friendly search type to the correct collection name
                        let collectionName;
                        let nameField;

                        // Determine the correct collection and field to search based on the type
                        switch (searchType) {
                          case "musician":
                            // For musicians, we look in the "users" collection where role is "musician"
                            collectionName = "users";
                            nameField = "profile.username"; // Based on IUser interface
                            break;
                          case "band":
                            // For bands, we look in a dedicated "bands" collection
                            collectionName = "bands";
                            nameField = "name"; // Assuming the field is "name" in bands collection
                            break;
                          case "venue":
                            // For venues, we look in a dedicated "venues" collection
                            collectionName = "venues";
                            nameField = "name"; // Assuming the field is "name" in venues collection
                            break;
                        }

                        const sanitizedSearchTerm = term.trim();
                        addDebug(
                          `Using collection: ${collectionName}, searching field: ${nameField}`
                        );

                        // Different search approach based on type
                        if (searchType === "musician") {
                          // For musicians, use a simpler query that doesn't require a composite index
                          // Just get all musicians and filter client-side
                          addDebug(
                            "Using client-side filtering for musicians (no index required)"
                          );

                          const simpleQuery = query(
                            collection(db, collectionName),
                            where("role", "==", "musician"),
                            limit(100) // Increase limit since we're filtering client-side
                          );

                          const querySnapshot = await getDocs(simpleQuery);
                          addDebug(
                            `Query returned ${querySnapshot.size} musicians total`
                          );

                          // Filter the results client-side for a case-insensitive search
                          const results: SearchResult[] = [];
                          querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            // Get the username with nested path safety
                            const username = data.profile?.username || "";

                            // Case-insensitive includes check
                            if (
                              username
                                .toLowerCase()
                                .includes(sanitizedSearchTerm.toLowerCase())
                            ) {
                              results.push({
                                id: doc.id,
                                name: username,
                                type: searchType,
                                description: data.profile?.bio || "",
                                imageUrl: data.profile?.profilePicture || "",
                                location: data.profile?.location || "",
                                genres: data.profile?.genres || [],
                                instruments: data.profile?.instruments || [],
                              });
                            }
                          });

                          addDebug(
                            `Filtered to ${results.length} matching musicians`
                          );
                          setSearchResults(results);
                        } else {
                          // For bands and venues, use the original query
                          const q = query(
                            collection(db, collectionName),
                            where(nameField, ">=", sanitizedSearchTerm),
                            where(
                              nameField,
                              "<=",
                              sanitizedSearchTerm + "\uf8ff"
                            ),
                            limit(20)
                          );

                          addDebug(`Executing ${searchType} search query`);
                          const querySnapshot = await getDocs(q);
                          addDebug(
                            `Query returned ${querySnapshot.size} results`
                          );

                          // Process regular query results
                          const results: SearchResult[] = [];
                          querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            const name = data.name || `Unknown ${searchType}`;

                            // Build result with type-specific fields
                            const result: SearchResult = {
                              id: doc.id,
                              name: name,
                              type: searchType,
                              description: data.description || "",
                              imageUrl: data.imageUrl || "",
                              location: data.location || "",
                              genres: data.genres || [],
                            };

                            // Add type-specific properties
                            if (searchType === "band") {
                              result.members = data.members?.length || 0;
                            } else if (searchType === "venue") {
                              result.capacity = data.capacity || 0;
                            }

                            results.push(result);
                          });

                          setSearchResults(results);
                        }
                      } catch (err: Error | unknown) {
                        console.error("Error fetching search results:", err);
                        addDebug(
                          `Error: ${
                            err instanceof Error ? err.message : "Unknown error"
                          }`
                        );
                        setError(
                          `Failed to fetch results: ${
                            err instanceof Error ? err.message : "Unknown error"
                          }`
                        );
                      }

                      setIsLoading(false);
                    };

                    // Execute the search function
                    performSearch();
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-300 p-4 rounded-lg mb-6">
          <p className="text-center">{error}</p>
        </div>
      )}

      {!isLoading && !error && searchResults.length === 0 && searchTerm && (
        <div className="bg-gray-800/30 p-8 rounded-2xl text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-300 mb-2">{`No results found for "${searchTerm}" as ${searchType}.`}</p>
          <p className="text-gray-400 text-sm">
            Try a different search term or category.
          </p>
        </div>
      )}

      {!isLoading && searchResults.length > 0 && (
        <div className="grid grid-cols-1 gap-4 mt-4">
          {searchResults.map((result) => (
            <div
              key={result.id}
              className="group bg-gray-800/30 rounded-2xl overflow-hidden border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-purple-900/20 transform hover:-translate-y-1"
              onClick={() => router.push(`/${result.type}/${result.id}`)}
            >
              <div className="flex flex-col md:flex-row">
                {/* Image/avatar section */}
                <div className="w-full md:w-40 h-40 relative bg-gray-900/50 flex items-center justify-center overflow-hidden">
                  {result.imageUrl ? (
                    <img
                      src={result.imageUrl}
                      alt={result.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        // Fallback to placeholder on error
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite error loop
                        target.src = getAvatarPlaceholder(
                          result.name,
                          result.type
                        );
                      }}
                    />
                  ) : (
                    // Placeholder avatar with initial
                    <img
                      src={getAvatarPlaceholder(result.name, result.type)}
                      alt={result.name}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Type indicator with translucent overlay */}
                  <div
                    className={`absolute top-0 left-0 w-full h-full bg-gradient-to-t opacity-60 ${
                      result.type === "musician"
                        ? "from-purple-900/60"
                        : result.type === "band"
                        ? "from-pink-900/60"
                        : "from-blue-900/60"
                    }`}
                  ></div>

                  <div
                    className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                      result.type === "musician"
                        ? "bg-purple-900/80 text-purple-100"
                        : result.type === "band"
                        ? "bg-pink-900/80 text-pink-100"
                        : "bg-blue-900/80 text-blue-100"
                    }`}
                  >
                    {getTypeIcon(result.type)}
                    <span className="ml-1 capitalize">{result.type}</span>
                  </div>
                </div>

                {/* Content section */}
                <div className="p-6 flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {result.name}
                  </h3>

                  {/* Additional details */}
                  <div className="text-gray-400 text-sm mb-3 flex flex-wrap gap-2">
                    {result.location && (
                      <span className="inline-flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4 mr-1"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                          />
                        </svg>
                        {result.location}
                      </span>
                    )}
                    {result.type === "musician" &&
                      result.instruments &&
                      result.instruments.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-700/50 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4 mr-1"
                          >
                            <path d="M8 16.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z" />
                            <path
                              fillRule="evenodd"
                              d="M4 2a2 2 0 00-2 2v11a3 3 0 003 3h10a3 3 0 003-3V4a2 2 0 00-2-2H4zm0 1.5a.5.5 0 00-.5.5v11c0 .83.67 1.5 1.5 1.5h10c.83 0 1.5-.67 1.5-1.5V4a.5.5 0 00-.5-.5H4z"
                            />
                          </svg>
                          {result.instruments.slice(0, 3).join(", ")}
                          {result.instruments.length > 3 && "..."}
                        </span>
                      )}
                    {result.type === "band" && result.members !== undefined && (
                      <span className="inline-flex items-center px-2 py-1 bg-gray-700/50 rounded-full">
                        <UsersIcon className="w-4 h-4 mr-1" />
                        {result.members} members
                      </span>
                    )}
                    {result.type === "venue" &&
                      result.capacity !== undefined && (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-700/50 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4 mr-1"
                          >
                            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                          </svg>
                          Capacity: {result.capacity}
                        </span>
                      )}
                  </div>

                  {/* Description */}
                  {result.description && (
                    <p className="text-gray-300 line-clamp-2 mb-3">
                      {result.description}
                    </p>
                  )}

                  {/* Genres */}
                  {result.genres && result.genres.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {result.genres.slice(0, 4).map((genre, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs ${
                            result.type === "musician"
                              ? "bg-purple-900/30 text-purple-200"
                              : result.type === "band"
                              ? "bg-pink-900/30 text-pink-200"
                              : "bg-blue-900/30 text-blue-200"
                          }`}
                        >
                          {genre}
                        </span>
                      ))}
                      {result.genres.length > 4 && (
                        <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded-full text-xs">
                          +{result.genres.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* View profile button */}
                  <div className="mt-4 flex justify-end">
                    <span
                      className={`inline-flex items-center text-xs font-medium ${
                        result.type === "musician"
                          ? "text-purple-400"
                          : result.type === "band"
                          ? "text-pink-400"
                          : "text-blue-400"
                      } group-hover:translate-x-1 transition-transform duration-300`}
                    >
                      View profile
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 ml-1"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Debug information - only visible during development */}
      {process.env.NODE_ENV === "development" && debug.length > 0 && (
        <div className="mt-8 p-4 border rounded bg-black/10 text-xs">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <pre className="whitespace-pre-wrap">
            {debug.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

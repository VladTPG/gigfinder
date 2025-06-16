"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IBand } from "@/lib/types";
import { createBand } from "@/lib/firebase/bands";
import { uploadFileToMinio } from "@/lib/minio";

// Available instruments and genres (same as other parts of the app)
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

export default function CreateBandPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  
  // Form state
  const [bandName, setBandName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  
  // Social links
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [twitter, setTwitter] = useState("");
  const [spotify, setSpotify] = useState("");
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle profile image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  // Toggle genre selection
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  // Toggle instrument selection
  const toggleInstrument = (instrumentId: string) => {
    setSelectedInstruments(prev => {
      if (prev.includes(instrumentId)) {
        return prev.filter(id => id !== instrumentId);
      } else {
        return [...prev, instrumentId];
      }
    });
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    // Validation
    if (!bandName.trim()) {
      setError("Band name is required");
      return;
    }

    if (selectedGenres.length === 0) {
      setError("Please select at least one genre");
      return;
    }

    if (selectedInstruments.length === 0) {
      setError("Please select at least one instrument you play");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload profile image if provided
      let profilePictureUrl = "";
      if (profileImage) {
        try {
          const imagePath = `bands/profile-${Date.now()}.${profileImage.name.split(".").pop()}`;
          profilePictureUrl = await uploadFileToMinio(profileImage, imagePath);
        } catch (uploadError) {
          console.error("Error uploading band image:", uploadError);
          setError("Failed to upload band image. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare social links (only include non-empty values)
      const socialLinks: Record<string, string> = {};
      if (website.trim()) socialLinks.website = website.trim();
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (facebook.trim()) socialLinks.facebook = facebook.trim();
      if (twitter.trim()) socialLinks.twitter = twitter.trim();
      if (spotify.trim()) socialLinks.spotify = spotify.trim();

      // Create band data
      const bandData: Omit<IBand, "id" | "createdAt" | "updatedAt"> = {
        name: bandName.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        genres: selectedGenres,
        profilePicture: profilePictureUrl || undefined,
        ...(Object.keys(socialLinks).length > 0 && { socialLinks }),
        members: [{
          userId: userProfile.id,
          role: "leader" as any,
          instruments: selectedInstruments,
          joinedAt: new Date() as any,
          isActive: true,
          permissions: []
        }],
        videos: [],
        followers: [],
        following: [],
        createdBy: userProfile.id,
        isActive: true,
      };

      // Create the band
      const bandId = await createBand(bandData, userProfile.id);
      
      // Redirect to the new band page
      router.push(`/bands/${bandId}`);
      
    } catch (err) {
      console.error("Error creating band:", err);
      setError("Failed to create band. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <p>Please log in to create a band.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Create New Band</h1>
          <p className="text-gray-400">
            Start your musical journey by creating a band and inviting other musicians
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-300 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Band Image */}
          <div className="bg-gray-800/50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Band Image</h2>
            
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                {profileImagePreview ? (
                  <Image
                    src={profileImagePreview}
                    alt="Band preview"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-2xl">🎵</div>
                )}
              </div>
              
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="band-image"
                />
                <label
                  htmlFor="band-image"
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Choose Image
                </label>
                <p className="text-sm text-gray-400 mt-2">
                  Optional: Upload a band photo or logo
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Band Name *</label>
              <input
                type="text"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                placeholder="Enter your band name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about your band..."
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State/Country"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Genres */}
          <div className="bg-gray-800/50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Genres *</h2>
            <p className="text-sm text-gray-400 mb-4">Select the genres your band plays</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedGenres.includes(genre)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Your Instruments */}
          <div className="bg-gray-800/50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Your Instruments *</h2>
            <p className="text-sm text-gray-400 mb-4">Select the instruments you play in this band</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {allInstruments.map((instrument) => (
                <button
                  key={instrument.id}
                  type="button"
                  onClick={() => toggleInstrument(instrument.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedInstruments.includes(instrument.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {instrument.label}
                </button>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
            <h2 className="text-lg font-semibold mb-4">Social Links (Optional)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourband.com"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Instagram</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@yourbandname"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Facebook</label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="facebook.com/yourband"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Spotify</label>
                <input
                  type="text"
                  value={spotify}
                  onChange={(e) => setSpotify(e.target.value)}
                  placeholder="Spotify artist URL"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Band..." : "Create Band"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
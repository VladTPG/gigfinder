"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateDocument } from "@/lib/firebase/firestore";
import { IProfile } from "@/lib/types";
import { uploadFileToMinio } from "@/lib/minio";

// Define constants directly in this file
const allInstruments = [
  { id: "guitar", label: "Guitar", svg: "/guitar.svg" },
  { id: "piano", label: "Piano", svg: "/piano.svg" },
  { id: "voice", label: "Voice", svg: "/mic.svg" },
  { id: "bass", label: "Bass", svg: "/bass.svg" },
  { id: "drums", label: "Drums", svg: "/drums.svg" },
];

const allGenres = [
  "Rock",
  "Pop",
  "Jazz",
  "Blues",
  "Classical",
  "Electronic",
  "Hip Hop",
  "R&B",
  "Country",
  "Folk",
  "Metal",
  "Punk",
  "Reggae",
  "Soul",
  "Funk",
  "Alternative",
  "Indie",
  "Experimental",
  "World",
  "Latin",
];

export default function EditProfilePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );

  // Load user data
  useEffect(() => {
    if (!userProfile) return;

    setUsername(userProfile.profile.username || "");
    setFirstName(userProfile.profile.firstName || "");
    setLastName(userProfile.profile.lastName || "");
    setBio(userProfile.profile.bio || "");
    setLocation(userProfile.profile.location || "");
    setSelectedInstruments(userProfile.profile.instruments || []);
    setSelectedGenres(userProfile.profile.genres || []);
    if (userProfile.profile.profilePicture) {
      setProfileImagePreview(userProfile.profile.profilePicture);
    }
  }, [userProfile]);

  // Handle profile image selection
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  // Toggle instrument selection
  const toggleInstrument = (instrumentId: string) => {
    setSelectedInstruments((prev) => {
      if (prev.includes(instrumentId)) {
        return prev.filter((id) => id !== instrumentId);
      } else {
        return [...prev, instrumentId];
      }
    });
  };

  // Toggle genre selection
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  // Submit form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare updates
      const updates: Partial<IProfile> = {
        username,
        firstName,
        lastName,
        bio,
        location,
        instruments: selectedInstruments,
        genres: selectedGenres,
      };

      // Upload profile image if changed
      if (profileImage) {
        try {
          // Format: profiles/userId/profile-${Date.now()}.${file extension}
          const imagePath = `profiles/${
            userProfile.id
          }/profile-${Date.now()}.${profileImage.name.split(".").pop()}`;
          console.log(`Uploading image to path: ${imagePath}`);

          const imageUrl = await uploadFileToMinio(profileImage, imagePath);
          updates.profilePicture = imageUrl;
        } catch (uploadError) {
          console.error("Error uploading profile image:", uploadError);
          setError(
            `Failed to upload profile image: ${
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown error"
            }`
          );
          setIsLoading(false);
          return;
        }
      }

      // Update profile in Firestore
      await updateDocument("users", userProfile.id, {
        profile: updates,
      });

      setSuccess("Profile updated successfully");
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Profile
        </button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 text-green-200 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="bg-gray-800/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-32 h-32 rounded-full overflow-hidden">
              {profileImagePreview ? (
                <Image
                  src={profileImagePreview}
                  alt="Profile Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-800 flex items-center justify-center text-3xl font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Upload New Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-700 file:text-white
                hover:file:bg-purple-600
                cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Recommended: Square image, at least 300x300 pixels
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-gray-800/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-1"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium mb-1"
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium mb-1"
                >
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg"
                rows={4}
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium mb-1"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg"
                placeholder="City, Country"
              />
            </div>
          </div>
        </div>

        {/* Instruments */}
        <div className="bg-gray-800/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Instruments</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {allInstruments.map((instrument) => {
              const isSelected = selectedInstruments.includes(instrument.id);
              return (
                <div
                  key={instrument.id}
                  onClick={() => toggleInstrument(instrument.id)}
                  className={`flex flex-col items-center p-3 rounded-lg cursor-pointer border transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-900/30"
                      : "border-gray-700 bg-gray-800/50 opacity-70"
                  }`}
                >
                  <div className="w-10 h-10 relative mb-2">
                    <Image
                      src={instrument.svg}
                      alt={instrument.label}
                      width={40}
                      height={40}
                      className={isSelected ? "filter brightness-0 invert" : ""}
                    />
                  </div>
                  <span className="text-xs">{instrument.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Genres */}
        <div className="bg-gray-800/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Genres</h2>
          <div className="flex flex-wrap gap-2">
            {allGenres.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isSelected
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full max-w-md py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

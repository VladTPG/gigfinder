"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/auth";
import {
  getDocumentById,
  updateDocument,
  addDocument,
} from "@/lib/firebase/firestore";
import { UserRole, IUser, IVenue } from "@/lib/types";
import ProtectedRoute from "@/components/auth/protected-route";

// Define instrument options
const instrumentOptions = [
  { id: "guitar", label: "Guitar", icon: "🎸", svg: "/guitar.svg" },
  { id: "piano", label: "Piano", icon: "🎹", svg: "/piano.svg" },
  { id: "voice", label: "Voice", icon: "🎤", svg: "/mic.svg" },
  { id: "bass", label: "Bass", icon: "🎸", svg: "/bass.svg" },
  { id: "drums", label: "Drums", icon: "🥁", svg: "/drums.svg" },
];

export default function ProfileSetupPage() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<IUser | null>(null);

  // Manager profile specific state
  const [venueName, setVenueName] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [venuePhotos, setVenuePhotos] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [venueBio, setVenueBio] = useState("");

  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and fetch their profile
    const fetchUserProfile = async () => {
      setIsLoading(true);
      const currentUser = getCurrentUser();

      if (currentUser) {
        try {
          const profile = await getDocumentById<IUser>(
            "users",
            currentUser.uid
          );
          setUserProfile(profile);

          // If user already has a role, go directly to feed
          if (profile && profile.role) {
            router.push("/feed");
            return;
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setError("Error loading profile data. Please try again.");
        }
      } else {
        // Not authenticated, redirect to sign-in
        router.push("/signin");
      }

      setIsLoading(false);
    };

    fetchUserProfile();
  }, [router]);

  const toggleInstrument = (instrument: string) => {
    setSelectedInstruments((prev) => {
      if (prev.includes(instrument)) {
        return prev.filter((i) => i !== instrument);
      } else {
        return [...prev, instrument];
      }
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedRole) {
        setError("Please select a user type");
        return;
      }
      if (selectedRole === UserRole.MUSICIAN) {
        setStep(2);
      } else if (selectedRole === UserRole.MANAGER) {
        setStep(3); // Go to venue info step
      } else {
        handleProfileSetup();
      }
    } else if (step === 2) {
      if (selectedInstruments.length === 0) {
        setError("Please select at least one instrument");
        return;
      }
      handleProfileSetup();
    } else if (step === 3) {
      if (!venueName || !venueLocation) {
        setError("Please provide venue name and location");
        return;
      }
      setStep(4); // Go to venue photos step
    } else if (step === 4) {
      handleProfileSetup();
    }
  };

  const handleProfileSetup = async () => {
    setError("");
    setIsLoading(true);

    try {
      const currentUser = getCurrentUser();

      if (!currentUser) {
        setError("User not authenticated");
        return;
      }

      const userId = currentUser.uid;

      // Update user role
      await updateDocument("users", userId, {
        role: selectedRole,
      });

      // If musician, update instruments
      if (
        selectedRole === UserRole.MUSICIAN &&
        selectedInstruments.length > 0
      ) {
        await updateDocument("users", userId, {
          "profile.instruments": selectedInstruments,
        });
      }

      // If manager, create venue and update manager profile
      if (selectedRole === UserRole.MANAGER) {
        // Create venue document
        const newVenue: Partial<IVenue> = {
          name: venueName,
          location: venueLocation,
          images: venuePhotos,
          manager: userId,
        };

        const venueRef = await addDocument("venues", newVenue);

        // Update manager profile
        await updateDocument("users", userId, {
          "profile.venueId": venueRef.id,
          "profile.venueName": venueName,
          "profile.venuePhotos": venuePhotos,
          "profile.publishedGigs": [],
          "profile.bio": venueBio,
          "profile.contactEmail": contactEmail,
          "profile.contactPhone": contactPhone,
          "profile.location": venueLocation,
        });
      }

      // Redirect to feed
      router.push("/feed");
    } catch (err: Error | unknown) {
      console.error("Profile setup error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to set up profile";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div>
          <h2 className="text-xl font-bold mb-4">Tell us about yourself</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div
              className={`border-2 ${
                selectedRole === UserRole.MANAGER
                  ? "border-accent bg-accent/10"
                  : "border-border"
              } rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors relative`}
              onClick={() => setSelectedRole(UserRole.MANAGER)}
            >
              <div className="w-16 h-16 mb-2 flex items-center justify-center">
                <Image
                  src="/venue.svg"
                  alt="Venue"
                  width={48}
                  height={48}
                  className={
                    selectedRole === UserRole.MANAGER
                      ? "filter brightness-0 invert"
                      : "text-muted-foreground opacity-70"
                  }
                />
              </div>
              <span className="text-center">Venue</span>
              {selectedRole === UserRole.MANAGER && (
                <div className="absolute top-2 right-2 bg-accent text-accent-foreground rounded-full p-1">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>

            <div
              className={`border-2 ${
                selectedRole === UserRole.MUSICIAN
                  ? "border-accent bg-accent/10 "
                  : "border-border"
              } rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors relative`}
              onClick={() => setSelectedRole(UserRole.MUSICIAN)}
            >
              <div className="w-16 h-16 mb-2 flex items-center justify-center">
                <Image
                  src="/piano.svg"
                  alt="Musician"
                  width={48}
                  height={48}
                  className={
                    selectedRole === UserRole.MUSICIAN
                      ? " filter brightness-0 invert"
                      : "text-muted-foreground opacity-70"
                  }
                />
              </div>
              <span className="text-center">Musician</span>
              {selectedRole === UserRole.MUSICIAN && (
                <div className="absolute top-2 right-2 bg-accent text-accent-foreground rounded-full p-1">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else if (step === 2) {
      return (
        <div>
          <h2 className="text-xl font-bold mb-2">What do you play?</h2>
          <p className="text-muted-foreground mb-4">
            Select at least one option
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {instrumentOptions.map((instrument) => (
              <div
                key={instrument.id}
                className={`border-2 ${
                  selectedInstruments.includes(instrument.id)
                    ? "border-accent bg-accent/10"
                    : "border-border"
                } rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors relative`}
                onClick={() => toggleInstrument(instrument.id)}
              >
                <div className="w-16 h-16 mb-2 flex items-center justify-center">
                  {instrument.svg ? (
                    <Image
                      src={instrument.svg}
                      alt={instrument.label}
                      width={42}
                      height={42}
                      className={
                        selectedInstruments.includes(instrument.id)
                          ? "filter brightness-0 invert"
                          : "text-muted-foreground opacity-70"
                      }
                    />
                  ) : (
                    <span className="text-3xl">{instrument.icon}</span>
                  )}
                </div>
                <span className="text-center">{instrument.label}</span>
                {selectedInstruments.includes(instrument.id) && (
                  <div className="absolute top-2 right-2 bg-accent text-accent-foreground rounded-full p-1">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (step === 3) {
      // Venue information step
      return (
        <div>
          <h2 className="text-xl font-bold mb-4">Tell us about your venue</h2>
          <div className="space-y-4 mb-8">
            <div>
              <label
                htmlFor="venueName"
                className="block mb-2 text-sm font-medium"
              >
                Venue Name
              </label>
              <input
                type="text"
                id="venueName"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full bg-background border border-border rounded-md p-2.5"
                placeholder="Enter venue name"
                required
              />
            </div>
            <div>
              <label
                htmlFor="venueLocation"
                className="block mb-2 text-sm font-medium"
              >
                Venue Location
              </label>
              <input
                type="text"
                id="venueLocation"
                value={venueLocation}
                onChange={(e) => setVenueLocation(e.target.value)}
                className="w-full bg-background border border-border rounded-md p-2.5"
                placeholder="City, Country"
                required
              />
            </div>
            <div>
              <label
                htmlFor="venueBio"
                className="block mb-2 text-sm font-medium"
              >
                Venue Description
              </label>
              <textarea
                id="venueBio"
                value={venueBio}
                onChange={(e) => setVenueBio(e.target.value)}
                className="w-full bg-background border border-border rounded-md p-2.5"
                placeholder="Tell musicians about your venue"
                rows={4}
              />
            </div>
            <div>
              <label
                htmlFor="contactEmail"
                className="block mb-2 text-sm font-medium"
              >
                Contact Email
              </label>
              <input
                type="email"
                id="contactEmail"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-md p-2.5"
                placeholder="contact@your-venue.com"
              />
            </div>
            <div>
              <label
                htmlFor="contactPhone"
                className="block mb-2 text-sm font-medium"
              >
                Contact Phone
              </label>
              <input
                type="tel"
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-background border border-border rounded-md p-2.5"
                placeholder="+1 123 456 7890"
              />
            </div>
          </div>
        </div>
      );
    } else if (step === 4) {
      // Venue photos step
      return (
        <div>
          <h2 className="text-xl font-bold mb-4">Upload venue photos</h2>
          <p className="text-sm text-gray-400 mb-4">
            Add photos of your venue to attract musicians
          </p>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {venuePhotos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square bg-gray-800 rounded-md overflow-hidden"
              >
                <Image
                  src={photo}
                  alt={`Venue photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => {
                    setVenuePhotos(venuePhotos.filter((_, i) => i !== index));
                  }}
                  className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}

            {/* Photo upload placeholder */}
            <div
              className="aspect-square border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-background"
              onClick={() => {
                // Mock photo upload for now
                const mockPhoto = `https://source.unsplash.com/random/300x300?venue,bar&sig=${Math.random()}`;
                setVenuePhotos([...venuePhotos, mockPhoto]);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span className="text-sm">Add photo</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            You can always add more photos later from your profile.
          </p>
        </div>
      );
    }
  };

  const getButtonText = () => {
    if (step === 1) {
      return "Next";
    } else if (step === 2) {
      return "Complete Profile";
    } else if (step === 3) {
      return "Next";
    } else if (step === 4) {
      return "Complete Profile";
    }
    return "Next";
  };

  if (isLoading && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="GigFinder Logo"
              width={180}
              height={50}
            />
          </div>

          <div className="bg-card rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-6">
              Profile Setup (Step {step}/4)
            </h1>

            {error && (
              <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }}
              className="space-y-4"
            >
              {renderStep()}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg shadow transition-colors"
              >
                {getButtonText()}
              </button>

              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev - 1)}
                  className="w-full py-2 px-4 bg-transparent border border-input text-foreground font-medium rounded-lg shadow transition-colors mt-2"
                >
                  Back
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

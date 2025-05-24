"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { getDocumentById, updateDocument } from "@/lib/firebase/firestore";
import { uploadFileToMinio } from "@/lib/minio";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IVenue, UserRole, IManagerProfile } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function EditVenuePage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const [venue, setVenue] = useState<IVenue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVenue, setIsLoadingVenue] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    images: [] as string[],
  });

  // Load existing venue data
  useEffect(() => {
    const loadVenue = async () => {
      if (!userProfile || userProfile.role !== UserRole.MANAGER) {
        setError("You don't have permission to edit venue information");
        setIsLoadingVenue(false);
        return;
      }

      try {
        setIsLoadingVenue(true);
        const managerProfile = userProfile.profile as IManagerProfile;

        if (!managerProfile.venueId) {
          setError("No venue associated with this account");
          return;
        }

        const venueData = await getDocumentById<IVenue>(
          "venues",
          managerProfile.venueId
        );

        if (!venueData) {
          setError("Venue not found");
          return;
        }

        // Check if user owns this venue
        if (venueData.manager !== userProfile.id) {
          setError("You don't have permission to edit this venue");
          return;
        }

        setVenue(venueData);

        // Populate form with existing data
        setFormData({
          name: venueData.name,
          location: venueData.location || "",
          description: managerProfile.bio || "",
          contactEmail: managerProfile.contactEmail || "",
          contactPhone: managerProfile.contactPhone || "",
          images: venueData.images || [],
        });
      } catch (err) {
        console.error("Error loading venue:", err);
        setError("Failed to load venue data");
      } finally {
        setIsLoadingVenue(false);
      }
    };

    if (userProfile) {
      loadVenue();
    }
  }, [userProfile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setIsUploadingPhoto(true);
    setError(null);

    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const fileExtension = file.name.split(".").pop();
      const filename = `venue-${timestamp}-${randomString}.${fileExtension}`;
      const uploadPath = `venues/${filename}`;

      console.log("Uploading venue photo:", filename);
      const imageUrl = await uploadFileToMinio(file, uploadPath);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrl],
      }));

      console.log("Photo uploaded successfully:", imageUrl);
    } catch (error) {
      console.error("Photo upload error:", error);
      setError("Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!venue || !userProfile || userProfile.role !== UserRole.MANAGER) {
      setError("Not authorized to edit this venue");
      return;
    }

    if (!formData.name || !formData.location) {
      setError("Please fill in venue name and location");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update venue document
      await updateDocument("venues", venue.id, {
        name: formData.name,
        location: formData.location,
        images: formData.images,
      });

      // Update manager profile
      await updateDocument("users", userProfile.id, {
        "profile.venueName": formData.name,
        "profile.bio": formData.description,
        "profile.contactEmail": formData.contactEmail,
        "profile.contactPhone": formData.contactPhone,
        "profile.location": formData.location,
        "profile.venuePhotos": formData.images,
      });

      // Redirect back to venue profile page
      router.push("/venue-profile");
    } catch (error) {
      console.error("Error updating venue:", error);
      setError("Failed to update venue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user can edit venue (venue managers only)
  const canEditVenue =
    userProfile?.role === UserRole.MANAGER && venue?.manager === userProfile.id;

  if (isLoadingVenue) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-xl shadow-lg p-6 md:p-8 animate-pulse">
            <div className="h-8 bg-secondary/40 rounded mb-4 w-3/4" />
            <div className="space-y-3">
              <div className="h-4 bg-secondary/40 rounded w-full" />
              <div className="h-4 bg-secondary/40 rounded w-full" />
              <div className="h-4 bg-secondary/40 rounded w-3/4" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !canEditVenue) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-destructive/20 text-destructive p-6 rounded-lg text-center">
            <h1 className="text-2xl font-bold mb-2">Error</h1>
            <p className="mb-4">
              {error || "You don't have permission to edit this venue"}
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/venue-profile">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/venue-profile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Edit Venue</h1>

          {error && (
            <div className="bg-destructive/20 text-destructive p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Venue Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., The Blue Note"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Location *
                </label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  placeholder="City, Country"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Tell musicians about your venue..."
                  className="w-full p-3 border border-border rounded-lg min-h-24 resize-none"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Contact Information</h2>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    handleInputChange("contactEmail", e.target.value)
                  }
                  placeholder="contact@your-venue.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Contact Phone
                </label>
                <Input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    handleInputChange("contactPhone", e.target.value)
                  }
                  placeholder="+1 123 456 7890"
                />
              </div>
            </div>

            {/* Venue Photos */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Venue Photos</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-gray-800 rounded-md overflow-hidden"
                  >
                    <Image
                      src={image}
                      alt={`Venue photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 transition-colors"
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

                {/* Photo upload button */}
                <div className="aspect-square border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-background relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  {isUploadingPhoto ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mb-2"></div>
                      <span className="text-sm">Uploading...</span>
                    </>
                  ) : (
                    <>
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
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        ></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span className="text-sm">Add Photo</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/venue-profile")}
                className="flex-1"
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

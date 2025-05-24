"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDocumentById, updateDocument } from "@/lib/firebase/firestore";
import { getGigs, deleteGig } from "@/lib/firebase/gigs";
import { uploadFileToMinio } from "@/lib/minio";
import { IVenue, UserRole, IManagerProfile, IGig } from "@/lib/types";

export default function VenueProfilePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [venue, setVenue] = useState<IVenue | null>(null);
  const [publishedGigs, setPublishedGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userProfile || userProfile.role !== UserRole.MANAGER) {
        router.push("/profile");
        return;
      }

      try {
        const managerProfile = userProfile.profile as IManagerProfile;

        // Fetch venue information
        if (managerProfile.venueId) {
          const venueData = await getDocumentById<IVenue>(
            "venues",
            managerProfile.venueId
          );
          setVenue(venueData);
        }

        // Fetch published gigs created by this venue manager
        try {
          const userGigs = await getGigs({
            venueId: managerProfile.venueId || userProfile.id,
            limit: 50, // Get all gigs for this venue
          });
          setPublishedGigs(userGigs);
        } catch (error) {
          console.error("Error fetching venue gigs:", error);
          setPublishedGigs([]);
        }
      } catch (err) {
        console.error("Error fetching venue profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userProfile, router]);

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !venue || !userProfile) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const fileExtension = file.name.split(".").pop();
      const filename = `venue-${timestamp}-${randomString}.${fileExtension}`;
      const uploadPath = `venues/${filename}`;

      console.log("Uploading venue photo:", filename);
      const imageUrl = await uploadFileToMinio(file, uploadPath);

      // Update venue images in Firestore
      const updatedImages = [...(venue.images || []), imageUrl];
      await updateDocument("venues", venue.id, { images: updatedImages });

      // Update local state
      setVenue((prev) => (prev ? { ...prev, images: updatedImages } : null));

      console.log("Photo uploaded successfully:", imageUrl);
    } catch (error) {
      console.error("Photo upload error:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (!userProfile || !venue) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        {loading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        ) : (
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-4">Venue not found</h1>
            <p className="mb-6 text-gray-400">
              There was a problem loading the venue profile. Please try again.
            </p>
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    );
  }

  const managerProfile = userProfile.profile as IManagerProfile;

  return (
    <div className="min-h-screen text-white pb-2 md:pb-0 md:min-w-lg">
      {/* Venue header */}
      <div className="flex flex-col items-center my-4 bg-gray-800/30 px-5 py-2 rounded-2xl">
        <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
          {/* Outer glow element */}
          <div className="absolute w-[300%] h-[300%] rounded-full bg-violet-400/90 blur-[150px] -z-20"></div>

          {/* Venue logo/image container */}
          <div className="w-24 h-24 rounded-full overflow-hidden relative z-10">
            {venue.images && venue.images.length > 0 ? (
              <Image
                src={venue.images[0]}
                alt={venue.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to avatar on error
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error loop
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    venue.name
                  )}&background=6D28D9&color=fff`;
                }}
              />
            ) : (
              <div className="w-full h-full bg-purple-800 flex items-center justify-center text-2xl font-bold ">
                {venue.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold mb-1">{venue.name}</h1>
        <p className="text-sm text-gray-400 mb-2">{venue.location}</p>

        <Link
          href="/venue-profile/edit"
          className="bg-gray-600 text-sm rounded-full px-4 py-1 my-3 hover:bg-gray-700 hover:shadow-center-glow transition-all duration-300 inline-block text-center"
        >
          Edit venue
        </Link>

        <p className="text-sm text-center text-gray-400 mb-3">
          {managerProfile.bio || "No description added yet."}
        </p>

        {/* Contact information */}
        <div className="flex justify-center gap-4 mb-4">
          {managerProfile.contactEmail && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>{managerProfile.contactEmail}</span>
            </div>
          )}

          {managerProfile.contactPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>{managerProfile.contactPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Venue photos section */}
      <div className="px-4 mb-4 bg-gray-800/30 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Venue Photos</h2>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={isUploadingPhoto}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button
              className="text-sm text-gray-400 hover:text-white transition-colors"
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? "Uploading..." : "Add Photos"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {venue.images && venue.images.length > 0 ? (
            venue.images.map((image, i) => (
              <div key={i} className="relative">
                <div className="aspect-video bg-gray-800 rounded-md overflow-hidden">
                  <Image
                    src={image}
                    alt={`Venue photo ${i + 1}`}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-gray-400">No venue photos added yet.</p>
              <p className="text-xs text-gray-500 mt-2">
                Add photos of your venue to attract musicians
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Published Gigs section */}
      <div className="px-4 bg-gray-800/30 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Published Gigs</h2>
          <Link href="/gigs/create" className="text-sm text-gray-400">
            Create Gig
          </Link>
        </div>

        <div className="space-y-3">
          {publishedGigs.length > 0 ? (
            publishedGigs.map((gig) => (
              <div
                key={gig.id}
                className="flex gap-3 items-center bg-gray-700/30 p-3 rounded-lg"
              >
                <div className="w-16 h-16 bg-gray-800 rounded-md overflow-hidden relative flex-shrink-0">
                  {gig.images && gig.images.length > 0 ? (
                    <Image
                      src={gig.images[0]}
                      alt={gig.title}
                      layout="fill"
                      objectFit="cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-800 flex items-center justify-center text-xl font-bold">
                      🎵
                    </div>
                  )}
                </div>
                <div className="flex-grow overflow-hidden">
                  <h3 className="font-medium truncate">{gig.title}</h3>
                  <p className="text-sm text-gray-400">
                    {gig.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {gig.startTime} - {gig.endTime} • {gig.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/gigs/${gig.id}`}
                    className="py-1 px-3 text-sm bg-purple-600 rounded-full flex-shrink-0 hover:bg-purple-700 transition"
                  >
                    View
                  </Link>
                  <Link
                    href={`/gigs/${gig.id}/edit`}
                    className="py-1 px-3 text-sm bg-gray-600 rounded-full flex-shrink-0 hover:bg-gray-700 transition"
                  >
                    Edit
                  </Link>
                  {gig.status === "draft" && (
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this draft gig? This action cannot be undone."
                          )
                        ) {
                          try {
                            await deleteGig(gig.id);
                            // Remove the deleted gig from the state
                            setPublishedGigs((prev) =>
                              prev.filter((g) => g.id !== gig.id)
                            );
                          } catch (error) {
                            console.error("Error deleting gig:", error);
                            alert("Failed to delete gig. Please try again.");
                          }
                        }
                      }}
                      className="py-1 px-3 text-sm bg-red-600 rounded-full flex-shrink-0 hover:bg-red-700 transition text-white"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl mb-3">🎵</div>
              <p className="text-gray-400">No gigs published yet.</p>
              <p className="text-xs text-gray-500 mt-2">
                Create and publish gigs to find musicians for your venue
              </p>
              <Link
                href="/gigs/create"
                className="mt-4 py-2 px-4 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition"
              >
                Create Your First Gig
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

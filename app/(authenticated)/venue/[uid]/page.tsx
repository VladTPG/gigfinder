"use client";

import { useState, useEffect } from "react";
import { getDocumentById } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { IVenue } from "@/lib/types";
import { use } from "react";

export default function VenueProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;

  const [venue, setVenue] = useState<IVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const venueData = await getDocumentById<IVenue>("venues", uid);

        if (venueData) {
          setVenue(venueData);
        } else {
          setError("Venue not found");
        }
      } catch (err) {
        console.error("Error fetching venue:", err);
        setError("Failed to load venue profile");
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p>{error || "Venue not found"}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:text-blue-700 font-medium flex items-center justify-center mx-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Go Back
        </button>
      </div>
    );
  }

  // Simplified venue display that works with the IVenue interface
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-blue-500 to-teal-400 rounded-xl p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {venue.images && venue.images.length > 0 ? (
              <img
                src={venue.images[0]}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                <span className="text-4xl">{venue.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="text-center md:text-left text-white">
            <h1 className="text-3xl font-bold mb-2">{venue.name}</h1>
            <p className="text-lg opacity-90">{venue.location}</p>
          </div>
        </div>
      </div>

      {/* Venue details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">About</h2>
            <p className="text-gray-600">
              Information about {venue.name} in {venue.location}.
            </p>
          </div>

          {/* Gallery */}
          {venue.images && venue.images.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {venue.images.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden"
                  >
                    <img
                      src={image}
                      alt={`${venue.name} - image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Contact</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Manager</p>
                <p className="font-medium">
                  {venue.manager || "Not available"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.back()}
            className="w-full text-blue-500 hover:text-blue-700 font-medium flex items-center justify-center p-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Search
          </button>
        </div>
      </div>
    </div>
  );
}

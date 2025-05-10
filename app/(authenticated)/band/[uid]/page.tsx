"use client";

import { useState, useEffect } from "react";
import { getDocumentById } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { IBand, IUser } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";

export default function BandProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const uid = unwrappedParams.uid;

  const [band, setBand] = useState<IBand | null>(null);
  const [members, setMembers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchBand = async () => {
      try {
        const bandData = await getDocumentById<IBand>("bands", uid);

        if (bandData) {
          setBand(bandData);

          // Fetch band members if available
          if (bandData.members && bandData.members.length > 0) {
            const memberPromises = bandData.members.map((memberId) =>
              getDocumentById<IUser>("users", memberId)
            );

            const memberResults = await Promise.all(memberPromises);
            setMembers(memberResults.filter(Boolean) as IUser[]);
          }
        } else {
          setError("Band not found");
        }
      } catch (err) {
        console.error("Error fetching band:", err);
        setError("Failed to load band profile");
      } finally {
        setLoading(false);
      }
    };

    fetchBand();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !band) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p>{error || "Band not found"}</p>
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

  // Generate avatar if no image
  const avatarUrl =
    band.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      band.name
    )}&background=DB2777&color=fff&size=256`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {band.profilePicture ? (
              <img
                src={band.profilePicture}
                alt={band.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-pink-100 text-pink-500">
                <span className="text-4xl">{band.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="text-center md:text-left text-white">
            <h1 className="text-3xl font-bold mb-2">{band.name}</h1>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {band.genres?.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 bg-white/20 rounded-full text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* More band details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">About</h2>
            <p className="text-gray-600">{band.bio || "No bio available."}</p>
          </div>

          {/* Band Members */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Members</h2>
            {members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                      {member.profile?.profilePicture ? (
                        <img
                          src={member.profile.profilePicture}
                          alt={member.profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-500">
                          <span className="text-lg">
                            {member.profile?.username?.charAt(0) || "M"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {member.profile?.username}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {member.profile?.instruments?.join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No members available</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Formed</p>
                <p className="font-medium">
                  {new Date(band.createdAt?.toDate()).getFullYear() ||
                    "Unknown"}
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

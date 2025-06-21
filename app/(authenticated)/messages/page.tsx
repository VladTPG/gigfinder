"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import GigMessages from "@/components/ui/gig-messages";

function MessagesContent() {
  const searchParams = useSearchParams();
  const gigId = searchParams.get("gigId");
  const artistId = searchParams.get("artistId");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Messages</h1>
      
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <GigMessages gigId={gigId || undefined} artistId={artistId || undefined} />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
} 
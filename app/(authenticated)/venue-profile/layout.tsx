import React from "react";

export default function VenueProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col items-center w-full max-w-4xl mx-auto px-4">
      {children}
    </main>
  );
}

"use client";

import { useAuth } from "@/lib/context/auth-context-fix";

export default function BandsPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Bands</h1>

          <p className="text-muted-foreground mb-6">
            Discover and connect with bands in your area.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sample band cards - to be replaced with real data */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-secondary/20 p-4 rounded-lg">
                <h3 className="font-medium text-lg">Band Name {i}</h3>
                <p className="text-sm text-muted-foreground">
                  Genre: Rock, Alternative
                </p>
                <p className="text-sm text-muted-foreground">
                  Location: New York
                </p>
                <button className="mt-2 text-accent text-sm">
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

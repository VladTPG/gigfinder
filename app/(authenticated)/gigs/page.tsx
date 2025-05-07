"use client";

import { useAuth } from "@/lib/context/auth-context-fix";

export default function GigsPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Gigs</h1>

          <p className="text-muted-foreground mb-6">
            Find upcoming gigs and events in your area.
          </p>

          <div className="space-y-4">
            {/* Sample gig cards - to be replaced with real data */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-secondary/20 p-4 rounded-lg flex flex-col md:flex-row gap-4"
              >
                <div className="md:w-1/4 bg-background rounded-lg p-4 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">15</span>
                  <span className="text-sm">June</span>
                  <span className="text-sm">2024</span>
                </div>
                <div className="md:w-3/4">
                  <h3 className="font-medium text-lg">Gig Name {i}</h3>
                  <p className="text-sm text-muted-foreground">
                    Venue: Downtown Music Hall
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Bands: Band 1, Band 2
                  </p>
                  <p className="text-sm text-muted-foreground">Time: 8:00 PM</p>
                  <button className="mt-2 text-accent text-sm">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { getUpcomingGigs, getUserGigApplications } from "@/lib/firebase/gigs";
import { IGig, IGigApplication } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, DollarSign, Plus, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function GigsPage() {
  const { userProfile } = useAuth();
  const [gigs, setGigs] = useState<IGig[]>([]);
  const [userApplications, setUserApplications] = useState<IGigApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user can create gigs (venue managers)
  const canCreateGig = userProfile?.role === "manager";

  useEffect(() => {
    loadGigs();
    if (userProfile?.id) {
      loadUserApplications();
    }
  }, [userProfile]);

  const loadGigs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔍 Loading upcoming gigs...");
      const upcomingGigs = await getUpcomingGigs(20);
      console.log("🔍 Loaded gigs:", upcomingGigs);
      console.log("🔍 Number of gigs loaded:", upcomingGigs.length);
      setGigs(upcomingGigs);
    } catch (err) {
      console.error("Error loading gigs:", err);
      setError("Failed to load gigs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserApplications = async () => {
    if (!userProfile?.id) return;
    
    try {
      const applications = await getUserGigApplications(userProfile.id);
      console.log("🔍 Loaded user applications:", applications);
      console.log("🔍 User profile ID:", userProfile.id);
      setUserApplications(applications);
    } catch (err) {
      console.error("Error loading user applications:", err);
    }
  };

  const getApplicationsForGig = (gigId: string) => {
    const applications = userApplications.filter(app => app.gigId === gigId);
    console.log(`🔍 Checking applications for gig ${gigId}:`, applications);
    console.log(`🔍 Total user applications:`, userApplications.length);
    return applications;
  };

  const formatDate = (date: Date) => {
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      year: date.getFullYear().toString(),
    };
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour24 = parseInt(hours);
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Gigs</h1>
              <p className="text-muted-foreground">
                Find upcoming gigs and events in your area.
              </p>
            </div>

            {canCreateGig && (
              <Link href="/gigs/create">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Gig
                </Button>
              </Link>
            )}
          </div>

          {error && (
            <div className="bg-destructive/20 text-destructive p-4 rounded-lg mb-6">
              {error}
              <Button
                onClick={loadGigs}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                Retry
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-secondary/20 p-4 rounded-lg flex flex-col md:flex-row gap-4 animate-pulse"
                >
                  <div className="md:w-1/4 bg-secondary/40 rounded-lg p-4 h-24" />
                  <div className="md:w-3/4 space-y-2">
                    <div className="h-6 bg-secondary/40 rounded w-3/4" />
                    <div className="h-4 bg-secondary/40 rounded w-1/2" />
                    <div className="h-4 bg-secondary/40 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : gigs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Gigs</h3>
              <p className="text-muted-foreground mb-4">
                There are no published gigs scheduled at this time.
              </p>
              {canCreateGig && (
                <Link href="/gigs/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create the First Gig
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {gigs.map((gig) => {
                const dateInfo = formatDate(gig.date);

                return (
                  <div
                    key={gig.id}
                    className="bg-secondary/20 p-4 rounded-lg flex flex-col md:flex-row gap-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="md:w-1/4 bg-background rounded-lg p-4 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">{dateInfo.day}</span>
                      <span className="text-sm text-muted-foreground">
                        {dateInfo.month}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {dateInfo.year}
                      </span>
                    </div>

                    <div className="md:w-3/4 space-y-2">
                      <h3 className="font-medium text-lg">{gig.title}</h3>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{gig.venueName}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(gig.startTime)} -{" "}
                            {formatTime(gig.endTime)}
                          </span>
                        </div>

                        {gig.paymentAmount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              {gig.paymentAmount} {gig.paymentCurrency}
                            </span>
                          </div>
                        )}
                      </div>

                      {gig.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {gig.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-1 bg-accent/20 text-accent text-xs rounded"
                            >
                              {genre}
                            </span>
                          ))}
                          {gig.genres.length > 3 && (
                            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                              +{gig.genres.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {gig.description}
                      </p>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/gigs/${gig.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>

                        {userProfile && (() => {
                          const applications = getApplicationsForGig(gig.id);
                          console.log(`🔍 Gig ${gig.id} applications:`, applications);
                          if (applications.length > 0) {
                            const applicationTypes = [...new Set(applications.map(app => app.applicantType))];
                            console.log(`🔍 Application types for gig ${gig.id}:`, applicationTypes);
                            return (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-md text-sm">
                                <CheckCircle className="h-4 w-4" />
                                <span>
                                  Applied as {applicationTypes.join(" & ")}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

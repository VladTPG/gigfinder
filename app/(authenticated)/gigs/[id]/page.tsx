"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import {
  getGig,
  createGigApplication,
  getGigApplications,
  deleteGig,
} from "@/lib/firebase/gigs";
import { IGig, IGigApplication, ApplicationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MapPin,
  DollarSign,
  Users,
  ArrowLeft,
  Music,
} from "lucide-react";
import Link from "next/link";

export default function GigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const gigId = params.id as string;

  const [gig, setGig] = useState<IGig | null>(null);
  const [applications, setApplications] = useState<IGigApplication[]>([]);
  const [userApplication, setUserApplication] =
    useState<IGigApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  useEffect(() => {
    if (gigId) {
      loadGigData();
    }
  }, [gigId, userProfile]);

  const loadGigData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load gig details
      const gigData = await getGig(gigId);
      if (!gigData) {
        setError("Gig not found");
        return;
      }
      setGig(gigData);

      // Load applications if user is the venue manager
      if (
        userProfile?.role === "manager" &&
        userProfile.id === gigData.createdBy
      ) {
        const applicationsList = await getGigApplications(gigId);
        setApplications(applicationsList);
      }

      // Check if current user has already applied
      if (userProfile?.role === "musician") {
        const applicationsList = await getGigApplications(gigId);
        const existingApplication = applicationsList.find(
          (app) => app.applicantId === userProfile.id
        );
        setUserApplication(existingApplication || null);
      }
    } catch (err) {
      console.error("Error loading gig data:", err);
      setError("Failed to load gig details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToGig = async () => {
    if (!userProfile || userProfile.role !== "musician" || !gig) {
      return;
    }

    setIsApplying(true);
    try {
      const applicationData = {
        gigId: gig.id,
        applicantId: userProfile.id,
        applicantType: "musician" as const,
        applicantName: userProfile.profile.username,
        message: applicationMessage.trim() || undefined,
        status: ApplicationStatus.PENDING,
      };

      await createGigApplication(applicationData);
      await loadGigData(); // Reload to show the new application
      setShowApplicationForm(false);
      setApplicationMessage("");
    } catch (err) {
      console.error("Error applying to gig:", err);
      setError("Failed to submit application. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour24 = parseInt(hours);
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-xl shadow-lg p-6 md:p-8 animate-pulse">
            <div className="h-8 bg-secondary/40 rounded mb-4 w-3/4" />
            <div className="h-4 bg-secondary/40 rounded mb-2 w-1/2" />
            <div className="h-4 bg-secondary/40 rounded mb-6 w-2/3" />
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

  if (error || !gig) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-destructive/20 text-destructive p-6 rounded-lg text-center">
            <h1 className="text-2xl font-bold mb-2">Error</h1>
            <p className="mb-4">{error || "Gig not found"}</p>
            <Link href="/gigs">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gigs
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const canApply = userProfile?.role === "musician" && !userApplication;
  const isVenueManager =
    userProfile?.role === "manager" && userProfile.id === gig.createdBy;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/gigs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gigs
            </Button>
          </Link>
        </div>

        {/* Main Gig Information */}
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Date Display */}
            <div className="lg:w-1/4">
              <div className="bg-accent/10 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-accent">
                  {gig.date.getDate()}
                </div>
                <div className="text-lg text-accent">
                  {gig.date.toLocaleDateString("en-US", { month: "short" })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {gig.date.getFullYear()}
                </div>
              </div>
            </div>

            {/* Gig Details */}
            <div className="lg:w-3/4 space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {gig.title}
                </h1>
                <div className="flex flex-wrap gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{gig.venueName}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatTime(gig.startTime)} - {formatTime(gig.endTime)}
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

                  {gig.maxApplicants && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Max {gig.maxApplicants} applicants</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-lg">{formatDate(gig.date)}</p>

              {gig.genres.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Preferred Genres:</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Description:</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {gig.description}
                </p>
              </div>

              {gig.requirements && (
                <div>
                  <h3 className="font-semibold mb-2">Requirements:</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {gig.requirements}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex flex-wrap gap-3">
              {canApply && !showApplicationForm && (
                <Button
                  onClick={() => setShowApplicationForm(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Music className="h-4 w-4 mr-2" />
                  Apply to Perform
                </Button>
              )}

              {isVenueManager && (
                <div className="flex gap-2">
                  <Link href={`/gigs/${gig.id}/edit`}>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Gig
                    </Button>
                  </Link>

                  {gig.status === "draft" && (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this draft gig? This action cannot be undone."
                          )
                        ) {
                          try {
                            await deleteGig(gig.id);
                            // Redirect to gigs page after deletion
                            router.push("/gigs");
                          } catch (error) {
                            console.error("Error deleting gig:", error);
                            setError("Failed to delete gig. Please try again.");
                          }
                        }
                      }}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>

            {userApplication && (
              <div className="bg-secondary/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Your Application</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      userApplication.status === ApplicationStatus.PENDING
                        ? "bg-yellow-100 text-yellow-800"
                        : userApplication.status === ApplicationStatus.ACCEPTED
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {userApplication.status.charAt(0).toUpperCase() +
                      userApplication.status.slice(1)}
                  </span>
                </div>
                {userApplication.message && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Your message:</strong> {userApplication.message}
                  </p>
                )}
                {userApplication.responseMessage && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Venue response:</strong>{" "}
                    {userApplication.responseMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Application Form */}
        {showApplicationForm && (
          <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Apply to Perform</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Message to Venue (Optional)
                </label>
                <textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  placeholder="Tell the venue why you'd be a great fit for this gig..."
                  className="w-full p-3 border border-border rounded-lg min-h-24 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleApplyToGig}
                  disabled={isApplying}
                  className="flex-1"
                >
                  {isApplying ? "Submitting..." : "Submit Application"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApplicationForm(false);
                    setApplicationMessage("");
                  }}
                  disabled={isApplying}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Applications Management (for venue managers) */}
        {isVenueManager && (
          <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">
              Applications ({applications.length})
            </h2>

            {applications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No applications received yet.
              </p>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div
                    key={application.id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {application.applicantName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Applied{" "}
                          {application.appliedAt instanceof Date
                            ? application.appliedAt.toLocaleDateString()
                            : new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          application.status === ApplicationStatus.PENDING
                            ? "bg-yellow-100 text-yellow-800"
                            : application.status === ApplicationStatus.ACCEPTED
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {application.status.charAt(0).toUpperCase() +
                          application.status.slice(1)}
                      </span>
                    </div>

                    {application.message && (
                      <p className="text-sm text-muted-foreground mb-3">
                        &ldquo;{application.message}&rdquo;
                      </p>
                    )}

                    {application.status === ApplicationStatus.PENDING && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Accept
                        </Button>
                        <Button size="sm" variant="outline">
                          Reject
                        </Button>
                        <Link href={`/musician/${application.applicantId}`}>
                          <Button size="sm" variant="ghost">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

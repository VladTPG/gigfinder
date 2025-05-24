"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { getGig, updateGig } from "@/lib/firebase/gigs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GigStatus, Genres, IGig } from "@/lib/types";
import { Calendar, DollarSign, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditGigPage() {
  const router = useRouter();
  const params = useParams();
  const { userProfile } = useAuth();
  const gigId = params.id as string;

  const [gig, setGig] = useState<IGig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGig, setIsLoadingGig] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    genres: [] as Genres[],
    paymentAmount: "",
    paymentCurrency: "USD",
    requirements: "",
    maxApplicants: "",
    status: GigStatus.PUBLISHED,
  });

  // Available genres
  const availableGenres = [
    Genres.ROCK,
    Genres.POP,
    Genres.JAZZ,
    Genres.BLUES,
    Genres.CLASSICAL,
    Genres.ELECTRONIC,
    Genres.HIP_HOP,
    Genres.COUNTRY,
    Genres.FOLK,
    Genres.REGGAE,
    Genres.PUNK,
    Genres.METAL,
    Genres.INDIE,
    Genres.ALTERNATIVE,
    Genres.LATIN,
  ];

  // Load existing gig data
  useEffect(() => {
    const loadGig = async () => {
      if (!gigId) return;

      try {
        setIsLoadingGig(true);
        const gigData = await getGig(gigId);

        if (!gigData) {
          setError("Gig not found");
          return;
        }

        // Check if user owns this gig
        if (userProfile?.id !== gigData.createdBy) {
          setError("You don't have permission to edit this gig");
          return;
        }

        setGig(gigData);

        // Populate form with existing data
        setFormData({
          title: gigData.title,
          description: gigData.description,
          date: gigData.date.toISOString().split("T")[0], // Convert to YYYY-MM-DD
          startTime: gigData.startTime,
          endTime: gigData.endTime,
          genres: gigData.genres,
          paymentAmount: gigData.paymentAmount?.toString() || "",
          paymentCurrency: gigData.paymentCurrency || "USD",
          requirements: gigData.requirements || "",
          maxApplicants: gigData.maxApplicants?.toString() || "",
          status: gigData.status,
        });
      } catch (err) {
        console.error("Error loading gig:", err);
        setError("Failed to load gig data");
      } finally {
        setIsLoadingGig(false);
      }
    };

    if (userProfile) {
      loadGig();
    }
  }, [gigId, userProfile]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenreToggle = (genre: Genres) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleSubmit = async (e: FormEvent, newStatus?: GigStatus) => {
    e.preventDefault();

    if (!gig || !userProfile || userProfile.role !== "manager") {
      setError("Not authorized to edit this gig");
      return;
    }

    if (
      !formData.title ||
      !formData.description ||
      !formData.date ||
      !formData.startTime ||
      !formData.endTime
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create the update object
      const updates: Partial<IGig> = {
        title: formData.title,
        description: formData.description,
        date: new Date(formData.date),
        startTime: formData.startTime,
        endTime: formData.endTime,
        genres: formData.genres,
        paymentCurrency: formData.paymentCurrency,
        status: newStatus || formData.status,
      };

      // Only add optional fields if they have values
      if (formData.paymentAmount && parseFloat(formData.paymentAmount) > 0) {
        updates.paymentAmount = parseFloat(formData.paymentAmount);
      }

      if (formData.requirements && formData.requirements.trim()) {
        updates.requirements = formData.requirements.trim();
      }

      if (formData.maxApplicants && parseInt(formData.maxApplicants) > 0) {
        updates.maxApplicants = parseInt(formData.maxApplicants);
      }

      await updateGig(gig.id, updates);

      // Redirect back to gig detail page
      router.push(`/gigs/${gig.id}`);
    } catch (error) {
      console.error("Error updating gig:", error);
      setError("Failed to update gig. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user can edit gigs (venue managers only)
  const canEditGig =
    userProfile?.role === "manager" && gig?.createdBy === userProfile.id;

  if (isLoadingGig) {
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

  if (error || !canEditGig) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-destructive/20 text-destructive p-6 rounded-lg text-center">
            <h1 className="text-2xl font-bold mb-2">Error</h1>
            <p className="mb-4">
              {error || "You don't have permission to edit this gig"}
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/gigs">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Gigs
                </Button>
              </Link>
              {gig && (
                <Link href={`/gigs/${gig.id}`}>
                  <Button variant="outline">View Gig</Button>
                </Link>
              )}
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
          <Link href={`/gigs/${gig.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gig
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Edit Gig</h1>

          {error && (
            <div className="bg-destructive/20 text-destructive p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Gig Title *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Friday Night Live Music"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe the gig, atmosphere, expectations..."
                  className="w-full p-3 border border-border rounded-lg min-h-24 resize-none"
                  required
                />
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date & Time
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Time *
                  </label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      handleInputChange("startTime", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Time *
                  </label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      handleInputChange("endTime", e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Gig Status</h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value={GigStatus.DRAFT}
                    checked={formData.status === GigStatus.DRAFT}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                    className="text-accent"
                  />
                  <span>Draft</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value={GigStatus.PUBLISHED}
                    checked={formData.status === GigStatus.PUBLISHED}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                    className="text-accent"
                  />
                  <span>Published</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value={GigStatus.CANCELLED}
                    checked={formData.status === GigStatus.CANCELLED}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                    className="text-accent"
                  />
                  <span>Cancelled</span>
                </label>
              </div>
            </div>

            {/* Genres */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Preferred Genres</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`p-2 rounded-lg border text-sm transition-colors ${
                      formData.genres.includes(genre)
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-background border-border hover:bg-accent/10"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment (Optional)
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount
                  </label>
                  <Input
                    type="number"
                    value={formData.paymentAmount}
                    onChange={(e) =>
                      handleInputChange("paymentAmount", e.target.value)
                    }
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.paymentCurrency}
                    onChange={(e) =>
                      handleInputChange("paymentCurrency", e.target.value)
                    }
                    className="w-full p-3 border border-border rounded-lg bg-background"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Additional Details</h2>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Maximum Applicants
                </label>
                <Input
                  type="number"
                  value={formData.maxApplicants}
                  onChange={(e) =>
                    handleInputChange("maxApplicants", e.target.value)
                  }
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Special Requirements
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) =>
                    handleInputChange("requirements", e.target.value)
                  }
                  placeholder="Any special equipment, experience level, or other requirements..."
                  className="w-full p-3 border border-border rounded-lg min-h-20 resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, GigStatus.DRAFT)}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? "Saving..." : "Save as Draft"}
              </Button>

              <Button
                type="button"
                onClick={(e) => handleSubmit(e, GigStatus.PUBLISHED)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Updating..." : "Update & Publish"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

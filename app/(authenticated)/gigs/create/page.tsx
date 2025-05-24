"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { createGig } from "@/lib/firebase/gigs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GigStatus, Genres } from "@/lib/types";
import { Calendar, DollarSign, Users } from "lucide-react";

export default function CreateGigPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
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
  });

  // Available genres (you might want to move this to a constants file)
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

  // Check if user can create gigs (venue managers)
  const canCreateGig = userProfile?.role === "manager";

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

  const handleSubmit = async (e: FormEvent, status: GigStatus) => {
    e.preventDefault();

    if (!userProfile || userProfile.role !== "manager") {
      setError("Only venue managers can create gigs");
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
      // Create the gig object
      const gigData: any = {
        title: formData.title,
        description: formData.description,
        venueId:
          "venueId" in userProfile.profile
            ? userProfile.profile.venueId
            : userProfile.id,
        venueName:
          "venueName" in userProfile.profile
            ? userProfile.profile.venueName
            : "Unknown Venue",
        date: new Date(formData.date),
        startTime: formData.startTime,
        endTime: formData.endTime,
        genres: formData.genres,
        paymentCurrency: formData.paymentCurrency,
        status,
        createdBy: userProfile.id,
        applications: [],
        acceptedApplicants: [],
      };

      // Only add optional fields if they have values
      if (formData.paymentAmount && parseFloat(formData.paymentAmount) > 0) {
        gigData.paymentAmount = parseFloat(formData.paymentAmount);
      }

      if (formData.requirements && formData.requirements.trim()) {
        gigData.requirements = formData.requirements.trim();
      }

      if (formData.maxApplicants && parseInt(formData.maxApplicants) > 0) {
        gigData.maxApplicants = parseInt(formData.maxApplicants);
      }

      const gigId = await createGig(gigData);

      if (status === GigStatus.PUBLISHED) {
        router.push(`/gigs/${gigId}`);
      } else {
        router.push("/gigs");
      }
    } catch (error) {
      console.error("Error creating gig:", error);
      setError("Failed to create gig. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreateGig) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-destructive/20 text-destructive p-6 rounded-lg text-center">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p>Only venue managers can create gigs.</p>
            <Button
              onClick={() => router.push("/gigs")}
              variant="outline"
              className="mt-4"
            >
              Back to Gigs
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            Create New Gig
          </h1>

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
                {isLoading ? "Publishing..." : "Publish Gig"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

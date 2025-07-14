"use client";

import { useState, useEffect } from "react";

import { useAuth } from "@/lib/context/auth-context-fix";
import { getGig, getGigApplications, updateGigApplication } from "@/lib/firebase/gigs";
import { IGig, IGigApplication, GigApplicationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Clock, User, MessageSquare, Calendar } from "lucide-react";
import Link from "next/link";

import { use } from "react";

export default function GigApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const gigId = unwrappedParams.id;
  

  const { userProfile } = useAuth();

  const [gig, setGig] = useState<IGig | null>(null);
  const [applications, setApplications] = useState<IGigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingApplications, setProcessingApplications] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      if (!gigId || !userProfile) return;

      try {
        setLoading(true);
        setError(null);

        // Load gig details
        const gigData = await getGig(gigId);
        if (!gigData) {
          setError("Gig not found");
          return;
        }

        // Check if user is the venue manager
        if (userProfile.role !== "manager" || userProfile.id !== gigData.createdBy) {
          setError("You don't have permission to view these applications");
          return;
        }

        setGig(gigData);

        // Load applications
        const applicationsList = await getGigApplications(gigId);
        setApplications(applicationsList);
      } catch (err) {
        console.error("Error loading applications:", err);
        setError("Failed to load applications");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [gigId, userProfile]);

  const handleApplicationResponse = async (
    applicationId: string,
    status: GigApplicationStatus,
    responseMessage?: string
  ) => {
    setProcessingApplications(prev => new Set(prev).add(applicationId));

    try {
      await updateGigApplication(applicationId, {
        status,
        responseMessage: responseMessage?.trim() || undefined,
      });

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, status, responseMessage: responseMessage?.trim() }
            : app
        )
      );
    } catch (err) {
      console.error("Error updating application:", err);
      setError("Failed to update application");
    } finally {
      setProcessingApplications(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
    }
  };

  const formatDate = (date: Date | any) => {
    if (!date) return "Unknown";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Error</h1>
          <p className="mb-6 text-gray-400">{error || "Gig not found"}</p>
          <Link href="/gigs">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gigs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === GigApplicationStatus.PENDING);
  const acceptedApplications = applications.filter(app => app.status === GigApplicationStatus.ACCEPTED);
  const rejectedApplications = applications.filter(app => app.status === GigApplicationStatus.REJECTED);

  return (
    <div className="min-h-screen text-white p-3 md:p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-800/30 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/gigs/${gig.id}`}>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gig
            </Button>
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Applications for "{gig.title}"</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(gig.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{gig.startTime} - {gig.endTime}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{pendingApplications.length}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{acceptedApplications.length}</div>
            <div className="text-xs text-gray-400">Accepted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{rejectedApplications.length}</div>
            <div className="text-xs text-gray-400">Rejected</div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-gray-800/30 p-8 rounded-2xl text-center">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-gray-300 mb-2">No applications received yet</p>
          <p className="text-gray-400 text-sm">
            Musicians will be able to apply to perform at your gig.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Applications */}
          {pendingApplications.length > 0 && (
            <div className="bg-gray-800/30 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                Pending Applications ({pendingApplications.length})
              </h2>
              <div className="space-y-4">
                {pendingApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onRespond={handleApplicationResponse}
                    isProcessing={processingApplications.has(application.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accepted Applications */}
          {acceptedApplications.length > 0 && (
            <div className="bg-gray-800/30 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                Accepted Applications ({acceptedApplications.length})
              </h2>
              <div className="space-y-4">
                {acceptedApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onRespond={handleApplicationResponse}
                    isProcessing={processingApplications.has(application.id)}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rejected Applications */}
          {rejectedApplications.length > 0 && (
            <div className="bg-gray-800/30 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <X className="h-5 w-5 text-red-400" />
                Rejected Applications ({rejectedApplications.length})
              </h2>
              <div className="space-y-4">
                {rejectedApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onRespond={handleApplicationResponse}
                    isProcessing={processingApplications.has(application.id)}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ApplicationCardProps {
  application: IGigApplication;
  onRespond: (id: string, status: GigApplicationStatus, message?: string) => void;
  isProcessing: boolean;
  showActions?: boolean;
}

function ApplicationCard({ application, onRespond, isProcessing, showActions = true }: ApplicationCardProps) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");

  const handleAccept = () => {
    onRespond(application.id, GigApplicationStatus.ACCEPTED, responseMessage.trim() || undefined);
    setShowResponseForm(false);
    setResponseMessage("");
  };

  const handleReject = () => {
    onRespond(application.id, GigApplicationStatus.REJECTED, responseMessage.trim() || undefined);
    setShowResponseForm(false);
    setResponseMessage("");
  };

  const getStatusColor = (status: GigApplicationStatus) => {
    switch (status) {
      case GigApplicationStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case GigApplicationStatus.ACCEPTED:
        return "bg-green-100 text-green-800 border-green-200";
      case GigApplicationStatus.REJECTED:
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "Unknown";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="border border-gray-700/50 rounded-xl p-4 hover:border-purple-500/50 transition-all">
      <div className="flex items-start gap-4">
        {/* Profile Picture */}
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold">
            {application.applicantName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Application Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-white">{application.applicantName}</h3>
              <p className="text-sm text-gray-400">
                Applied {formatDate(application.appliedAt)}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(application.status)}`}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </span>
          </div>

          {/* Application Message */}
          {application.message && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">Message</span>
              </div>
              <p className="text-sm text-gray-300 bg-gray-700/30 p-2 rounded">
                "{application.message}"
              </p>
            </div>
          )}

          {/* Response Message */}
          {application.responseMessage && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <User className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">Your Response</span>
              </div>
              <p className="text-sm text-gray-300 bg-purple-700/20 p-2 rounded">
                "{application.responseMessage}"
              </p>
            </div>
          )}

          {/* Actions */}
          {showActions && application.status === GigApplicationStatus.PENDING && (
            <div className="space-y-3">
              {!showResponseForm ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onRespond(application.id, GigApplicationStatus.ACCEPTED)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowResponseForm(true)}
                    disabled={isProcessing}
                  >
                    Respond with Message
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRespond(application.id, GigApplicationStatus.REJECTED)}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Add a message to your response (optional)..."
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAccept}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isProcessing}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowResponseForm(false);
                        setResponseMessage("");
                      }}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
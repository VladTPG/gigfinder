"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { 
  getUserInvitations, 
  getUserApplications,
  acceptBandInvitation,
  declineBandInvitation 
} from "@/lib/firebase/bands";
import { 
  IBandInvitation, 
  IBandApplication, 
  InvitationStatus,
  GigApplicationStatus,
  BandMemberRole 
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Mail, 
  Clock, 
  Check, 
  X, 
  Users,
  Crown,
  Shield,
  User,
  Eye,
  RefreshCw
} from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<IBandInvitation[]>([]);
  const [applications, setApplications] = useState<IBandApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [invitationsData, applicationsData] = await Promise.all([
        getUserInvitations(user!.uid),
        getUserApplications(user!.uid)
      ]);
      
      setInvitations(invitationsData);
      setApplications(applicationsData);
    } catch (error) {
      console.error("Error loading notifications:", error);
      alert("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitation(invitationId);
      await acceptBandInvitation(invitationId);
      alert("Invitation accepted! Welcome to the band!");
      loadNotifications(); // Refresh data
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      alert(error.message || "Failed to accept invitation");
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitation(invitationId);
      await declineBandInvitation(invitationId);
      alert("Invitation declined");
      loadNotifications(); // Refresh data
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      alert(error.message || "Failed to decline invitation");
    } finally {
      setProcessingInvitation(null);
    }
  };

  const getRoleIcon = (role: BandMemberRole) => {
    switch (role) {
      case BandMemberRole.LEADER:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case BandMemberRole.ADMIN:
        return <Shield className="w-4 h-4 text-blue-500" />;
      case BandMemberRole.MEMBER:
        return <User className="w-4 h-4 text-green-500" />;
      case BandMemberRole.GUEST:
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalNotifications = invitations.length + applications.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-3 md:p-4">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-purple-600" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Notifications
              </h1>
              <p className="text-sm text-gray-600">
                {totalNotifications} pending notification{totalNotifications !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <Button
            onClick={loadNotifications}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Content */}
        {totalNotifications === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending notifications at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Band Invitations */}
            {invitations.length > 0 && (
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Band Invitations
                  </h2>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {invitations.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <h3 className="font-semibold text-gray-900 truncate">
                              {invitation.bandName}
                            </h3>
                            {getRoleIcon(invitation.role)}
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                              {invitation.role}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {invitation.instruments.map((instrument) => (
                              <span
                                key={instrument}
                                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                              >
                                {instrument}
                              </span>
                            ))}
                          </div>

                          {invitation.message && (
                            <p className="text-sm text-gray-600 mb-2 bg-white/50 p-2 rounded-lg">
                              "{invitation.message}"
                            </p>
                          )}

                          <p className="text-xs text-gray-500">
                            Invited {formatDate(invitation.createdAt)} • 
                            Expires {formatDate(invitation.expiresAt)}
                          </p>
                        </div>

                        <div className="flex gap-2 sm:flex-col sm:w-auto w-full">
                          <Button
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            disabled={processingInvitation === invitation.id}
                            size="sm"
                            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                          >
                            {processingInvitation === invitation.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <Check className="w-4 h-4 mr-2" />
                            )}
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            disabled={processingInvitation === invitation.id}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Band Applications */}
            {applications.length > 0 && (
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Your Applications
                  </h2>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                    {applications.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-orange-600" />
                            <h3 className="font-semibold text-gray-900 truncate">
                              {application.bandName}
                            </h3>
                            {getRoleIcon(application.role)}
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                              {application.role}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {application.instruments.map((instrument) => (
                              <span
                                key={instrument}
                                className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full"
                              >
                                {instrument}
                              </span>
                            ))}
                          </div>

                          {application.message && (
                            <p className="text-sm text-gray-600 mb-2 bg-white/50 p-2 rounded-lg">
                              "{application.message}"
                            </p>
                          )}

                          <p className="text-xs text-gray-500">
                            Applied {formatDate(application.createdAt)} • 
                            Expires {formatDate(application.expiresAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-orange-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">Pending</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
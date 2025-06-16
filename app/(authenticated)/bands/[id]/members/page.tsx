"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context-fix";
import { 
  getBandById, 
  sendBandInvitation, 
  getBandApplications,
  acceptBandApplication,
  declineBandApplication,
  removeBandMember,
  hasPermission 
} from "@/lib/firebase/bands";
import { searchUsers, getUsersByIds } from "@/lib/firebase/users";
import { 
  IBand, 
  IBandApplication, 
  BandMemberRole, 
  BandPermission,
  IUser 
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Select components not needed - using native HTML select
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  Check, 
  X, 
  Search,
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const INSTRUMENTS = [
  "Vocals", "Guitar", "Bass", "Drums", "Piano", "Keyboard", "Violin", 
  "Saxophone", "Trumpet", "Flute", "Cello", "Clarinet", "Trombone", 
  "Harmonica", "Banjo", "Mandolin", "Ukulele", "Harp", "Accordion", "Other"
];

export default function BandMembersPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bandId = params.id as string;

  const [band, setBand] = useState<IBand | null>(null);
  const [applications, setApplications] = useState<IBandApplication[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Map<string, IUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<IUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  // Invite form state
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [inviteRole, setInviteRole] = useState<BandMemberRole>(BandMemberRole.MEMBER);
  const [inviteInstruments, setInviteInstruments] = useState<string[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (bandId && user) {
      loadBandData();
    }
  }, [bandId, user]);

  const loadBandData = async () => {
    try {
      setLoading(true);
      const [bandData, applicationsData] = await Promise.all([
        getBandById(bandId),
        getBandApplications(bandId)
      ]);
      
      if (!bandData) {
        toast.error("Band not found");
        router.push("/bands");
        return;
      }

      // Check if user has permission to manage members
      if (!hasPermission(bandData, user!.uid, BandPermission.MANAGE_MEMBERS)) {
        toast.error("You don't have permission to manage members");
        router.push(`/bands/${bandId}`);
        return;
      }

      setBand(bandData);
      setApplications(applicationsData);

      // Fetch member profiles
      const memberUserIds = bandData.members
        .filter(member => member.isActive)
        .map(member => member.userId);
      
      if (memberUserIds.length > 0) {
        const memberUsers = await getUsersByIds(memberUserIds);
        const profilesMap = new Map<string, IUser>();
        memberUsers.forEach(user => {
          profilesMap.set(user.id, user);
        });
        setMemberProfiles(profilesMap);
      }
    } catch (error) {
      console.error("Error loading band data:", error);
      toast.error("Failed to load band data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchUsers(term);
      // Filter out existing members
      const filteredResults = results.filter(user => 
        !band?.members.some(member => member.userId === user.id && member.isActive)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedUser || !band || inviteInstruments.length === 0) {
      toast.error("Please select a user and at least one instrument");
      return;
    }

    try {
      setInviting(true);
      await sendBandInvitation(
        bandId,
        selectedUser.id,
        user!.uid,
        inviteRole,
        inviteInstruments,
        inviteMessage || undefined
      );
      
      toast.success(`Invitation sent to ${selectedUser.profile.username}`);
      setInviteDialogOpen(false);
      resetInviteForm();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const resetInviteForm = () => {
    setSelectedUser(null);
    setInviteRole(BandMemberRole.MEMBER);
    setInviteInstruments([]);
    setInviteMessage("");
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleAcceptApplication = async (applicationId: string) => {
    try {
      await acceptBandApplication(applicationId, user!.uid);
      toast.success("Application accepted");
      loadBandData(); // Refresh data
    } catch (error: any) {
      console.error("Error accepting application:", error);
      toast.error(error.message || "Failed to accept application");
    }
  };

  const handleDeclineApplication = async (applicationId: string) => {
    try {
      await declineBandApplication(applicationId, user!.uid);
      toast.success("Application declined");
      loadBandData(); // Refresh data
    } catch (error: any) {
      console.error("Error declining application:", error);
      toast.error(error.message || "Failed to decline application");
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeBandMember(bandId, memberUserId, user!.uid);
      toast.success("Member removed");
      loadBandData(); // Refresh data
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "Failed to remove member");
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

  const toggleInstrument = (instrument: string) => {
    setInviteInstruments(prev => 
      prev.includes(instrument)
        ? prev.filter(i => i !== instrument)
        : [...prev, instrument]
    );
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/musician/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-3 md:p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!band) return null;

  const activeMembers = band.members.filter(member => member.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-3 md:p-4">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${bandId}`)}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                {band.name} Members
              </h1>
              <p className="text-sm text-gray-300">
                Manage band members and applications
              </p>
            </div>
          </div>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Invite New Member</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* User Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Search Users</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                          <Input
                        placeholder="Search by username or name..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          handleSearch(e.target.value);
                        }}
                        className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                  </div>
                  
                  {searching && (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                  )}
                  
                                      {searchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-gray-600 rounded-md bg-gray-700">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setSelectedUser(user);
                              setSearchResults([]);
                              setSearchTerm("");
                            }}
                            className="w-full p-2 text-left hover:bg-gray-600 border-b border-gray-600 last:border-b-0 flex items-center gap-2 text-white"
                          >
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user.profile.username.charAt(0).toUpperCase()}
                          </div>
                                                      <div>
                              <div className="font-medium text-sm text-white">{user.profile.username}</div>
                              {user.profile.firstName && user.profile.lastName && (
                                <div className="text-xs text-gray-300">
                                  {user.profile.firstName} {user.profile.lastName}
                                </div>
                              )}
                            </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected User */}
                {selectedUser && (
                  <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {selectedUser.profile.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-white">{selectedUser.profile.username}</div>
                        {selectedUser.profile.firstName && selectedUser.profile.lastName && (
                          <div className="text-xs text-gray-300">
                            {selectedUser.profile.firstName} {selectedUser.profile.lastName}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(null)}
                        className="ml-auto p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Role Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as BandMemberRole)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={BandMemberRole.MEMBER}>Member</option>
                    <option value={BandMemberRole.ADMIN}>Admin</option>
                    <option value={BandMemberRole.GUEST}>Guest</option>
                  </select>
                </div>

                {/* Instruments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Instruments</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-700/50 rounded-lg border border-gray-600">
                    {INSTRUMENTS.map((instrument) => (
                      <button
                        key={instrument}
                        type="button"
                        onClick={() => toggleInstrument(instrument)}
                        className={`p-2 text-xs rounded-md border transition-colors ${
                          inviteInstruments.includes(instrument)
                            ? "bg-purple-600 border-purple-500 text-white"
                            : "bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500"
                        }`}
                      >
                        {instrument}
                      </button>
                    ))}
                  </div>
                  {inviteInstruments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {inviteInstruments.map((instrument) => (
                        <Badge key={instrument} variant="secondary" className="text-xs bg-gray-600 text-gray-200">
                          {instrument}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Message (Optional)</label>
                  <Textarea
                    placeholder="Add a personal message..."
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={3}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleInvite}
                    disabled={!selectedUser || inviteInstruments.length === 0 || inviting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {inviting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Invitation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border border-gray-700">
            <TabsTrigger value="members" className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Current Members</span>
              <span className="sm:hidden">Members</span>
              <Badge variant="secondary" className="bg-gray-600 text-gray-200">{activeMembers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>
              <Badge variant="secondary" className="bg-gray-600 text-gray-200">{applications.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Current Members */}
          <TabsContent value="members" className="space-y-4">
            <div className="grid gap-3 md:gap-4">
              {activeMembers.map((member) => {
                const memberProfile = memberProfiles.get(member.userId);
                const displayName = memberProfile?.profile.username || `User ${member.userId.slice(0, 8)}...`;
                const avatarLetter = memberProfile?.profile.username?.charAt(0).toUpperCase() || member.userId.charAt(0).toUpperCase();
                
                return (
                  <Card key={member.userId} className="hover:shadow-md transition-shadow bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {memberProfile?.profile.profilePicture ? (
                            <img
                              src={memberProfile.profile.profilePicture}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-medium">
                              {avatarLetter}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm md:text-base truncate text-white">
                                {displayName}
                              </span>
                              {getRoleIcon(member.role)}
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                {member.role}
                              </Badge>
                            </div>
                            {memberProfile?.profile.firstName && memberProfile?.profile.lastName && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {memberProfile.profile.firstName} {memberProfile.profile.lastName}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.instruments.slice(0, 3).map((instrument) => (
                                <Badge key={instrument} variant="secondary" className="text-xs bg-gray-600 text-gray-200">
                                  {instrument}
                                </Badge>
                              ))}
                              {member.instruments.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-gray-600 text-gray-200">
                                  +{member.instruments.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProfile(member.userId)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 p-2"
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        {member.userId !== user?.uid && member.role !== BandMemberRole.LEADER && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications" className="space-y-4">
            {applications.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Applications</h3>
                  <p className="text-gray-300">No pending applications at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4">
                {applications.map((application) => (
                  <Card key={application.id} className="hover:shadow-md transition-shadow bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white font-medium">
                              {application.applicantName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm md:text-base truncate text-white">
                                  {application.applicantName}
                                </span>
                                {getRoleIcon(application.role)}
                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                  {application.role}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {application.instruments.map((instrument) => (
                                  <Badge key={instrument} variant="secondary" className="text-xs bg-gray-600 text-gray-200">
                                    {instrument}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {application.message && (
                          <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                            <p className="text-sm text-gray-300">{application.message}</p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => handleViewProfile(application.applicantUserId)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-blue-400 border-blue-600 hover:bg-blue-900/20"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Profile
                          </Button>
                          <div className="flex gap-2 flex-1">
                            <Button
                              onClick={() => handleAcceptApplication(application.id)}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              onClick={() => handleDeclineApplication(application.id)}
                              variant="outline"
                              size="sm"
                              className="flex-1 text-red-400 border-red-600 hover:bg-red-900/20"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 
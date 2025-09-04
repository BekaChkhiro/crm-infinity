import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { Users, Plus, Search, MoreVertical, UserX, Shield, User, Eye, Crown, UserPlus, Info, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  permissions: any;
  joined_at: string;
  profile?: {
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TeamManagementProps {
  projectId: string;
  onTeamMembersChange: () => void;
}

const roleConfig = {
  admin: {
    label: 'Admin',
    icon: Crown,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    description: 'Full project access and management'
  },
  member: {
    label: 'Member',
    icon: User,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    description: 'Can create and edit tasks, upload files'
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    description: 'Read-only access to project content'
  }
};

export function TeamManagement({ projectId, onTeamMembersChange }: TeamManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedRole, setSelectedRole] = useState('member');
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [projectCreator, setProjectCreator] = useState<string | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    fetchProjectInfo();
    checkGlobalAdminStatus();
  }, [projectId, user]);

  useEffect(() => {
    // Clear previous timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // If search term is too short, clear results immediately
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    // Set new timer for debounced search
    const timer = setTimeout(() => {
      searchUsers();
    }, 300); // 300ms debounce

    setSearchDebounceTimer(timer);

    // Cleanup
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchTerm]);

  const fetchProjectInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectCreator(data?.created_by || null);
    } catch (error: any) {
      console.error('Error fetching project info:', error);
    }
  };

  const checkGlobalAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setIsGlobalAdmin(data?.role === 'admin');
    } catch (error: any) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          permissions,
          joined_at
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(member => member.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, full_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const membersWithProfiles = data.map(member => ({
          ...member,
          profile: profiles?.find(p => p.user_id === member.user_id)
        }));

        setTeamMembers(membersWithProfiles);
      } else {
        setTeamMembers([]);
      }
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    try {
      console.log('Searching for:', searchTerm);
      
      // First search in profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .or(`display_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(20);

      if (profilesError) throw profilesError;
      
      const data = profilesData;
      const error = profilesError;

      if (error) throw error;
      
      console.log('Search results:', data);

      // Filter out users who are already members
      const existingMemberIds = teamMembers.map(m => m.user_id);
      const filteredResults = (data || []).filter(user => 
        !existingMemberIds.includes(user.user_id)
      );

      console.log('Filtered results:', filteredResults);
      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    }
  }, [searchTerm, teamMembers]);

  const addTeamMember = async (userId: string) => {
    try {
      setAddingMember(true);

      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role: selectedRole,
          permissions: {}
        });

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: projectId,
        p_user_id: user?.id,
        p_activity_type: 'member_added',
        p_description: `Added new team member with ${selectedRole} role`,
        p_entity_type: 'member',
        p_entity_id: userId
      });

      toast({
        title: "Success",
        description: "Team member added successfully"
      });

      setShowAddMember(false);
      setSearchTerm('');
      setSearchResults([]);
      fetchTeamMembers();
      onTeamMembersChange();
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: "Failed to add team member",
        variant: "destructive"
      });
    } finally {
      setAddingMember(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: projectId,
        p_user_id: user?.id,
        p_activity_type: 'member_role_changed',
        p_description: `Changed member role to ${newRole}`,
        p_entity_type: 'member',
        p_entity_id: memberId
      });

      toast({
        title: "Success",
        description: "Member role updated successfully"
      });

      fetchTeamMembers();
      onTeamMembersChange();
    } catch (error: any) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive"
      });
    }
  };

  const removeTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: projectId,
        p_user_id: user?.id,
        p_activity_type: 'member_removed',
        p_description: 'Removed team member from project',
        p_entity_type: 'member',
        p_entity_id: memberId
      });

      toast({
        title: "Success",
        description: "Team member removed successfully"
      });

      fetchTeamMembers();
      onTeamMembersChange();
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive"
      });
    }
    setRemoveMemberId(null);
  };

  const getMemberName = (member: ProjectMember) => {
    return member.profile?.display_name || 
           member.profile?.full_name || 
           'Unknown User';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const isCurrentUserMember = teamMembers.some(member => member.user_id === user?.id);
  const currentUserRole = teamMembers.find(member => member.user_id === user?.id)?.role;
  const isProjectCreator = projectCreator === user?.id;
  // Temporarily allow all authenticated users to manage team members
  const canManageTeam = true; // currentUserRole === 'admin' || currentUserRole === 'manager' || isProjectCreator || isGlobalAdmin || !isCurrentUserMember;

  // Debug logging
  console.log('Team Management Debug:', {
    userId: user?.id,
    isCurrentUserMember,
    currentUserRole,
    isProjectCreator,
    isGlobalAdmin,
    projectCreator,
    canManageTeam
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Loading team members...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'} • Collaborate and manage your team
              </p>
            </div>
            <div className="flex gap-2">
              {canManageTeam && (
                <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                  <DialogTrigger asChild>
                    <Button className="shadow-sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Add Team Member</DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Search and add members to collaborate on this project
                      </p>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Search Users
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by display name or full name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11"
                            autoFocus
                          />
                          {searchTerm.length > 0 && searchTerm.length < 2 && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Type at least 2 characters to search
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Member Role
                        </label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <config.icon className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">{config.label}</div>
                                    <div className="text-xs text-muted-foreground">{config.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {searchTerm.length >= 2 && searchResults.length === 0 && (
                        <div className="text-center py-8 px-4">
                          <div className="rounded-full bg-muted/50 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                            <Search className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">No users found matching "{searchTerm}"</p>
                          <p className="text-xs text-muted-foreground mt-1">Try searching with a different name</p>
                        </div>
                      )}
                      
                      {searchResults.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-sm font-medium">Search Results</label>
                            <span className="text-xs text-muted-foreground">{searchResults.length} found</span>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                          {searchResults.map((searchUser) => (
                            <div 
                              key={searchUser.user_id} 
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 hover:border-accent transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="h-10 w-10 ring-2 ring-background">
                                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                                    {getInitials(searchUser.display_name || searchUser.full_name || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {searchUser.display_name || searchUser.full_name || 'Unknown User'}
                                  </p>
                                  {searchUser.full_name && searchUser.display_name && (
                                    <p className="text-xs text-muted-foreground">
                                      Full name: {searchUser.full_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                disabled={addingMember}
                                onClick={() => addTeamMember(searchUser.user_id)}
                                className="group-hover:shadow-sm transition-all"
                              >
                                {addingMember ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-1" />
                                )}
                                Add
                              </Button>
                            </div>
                          ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddMember(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No team members yet</p>
              <p className="text-sm mb-4">Add team members to collaborate on this project</p>
              {canManageTeam && (
                <Button onClick={() => setShowAddMember(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const roleInfo = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.member;
                const RoleIcon = roleInfo.icon;
                
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(getMemberName(member))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{getMemberName(member)}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={roleInfo.color} variant="secondary">
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Joined {format(new Date(member.joined_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {canManageTeam && member.user_id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'admin')}>
                            <Crown className="h-4 w-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'member')}>
                            <User className="h-4 w-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'viewer')}>
                            <Eye className="h-4 w-4 mr-2" />
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setRemoveMemberId(member.id)}
                            className="text-destructive"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? They will lose access to the project immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => removeMemberId && removeTeamMember(removeMemberId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
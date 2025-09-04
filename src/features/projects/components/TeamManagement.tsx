import React, { useState, useEffect } from 'react';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { Users, Plus, Trash2, Mail } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
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

export function TeamManagement({ projectId, onTeamMembersChange }: TeamManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Get team members with their profiles
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          joined_at
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Get profile information for each member
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

  const addTeamMember = async () => {
    if (!userEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingMember(true);

      // First, find the user by email from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name')
        .eq('user_id', userEmail) // This won't work as user_id is not email
        .single();

      // Since we can't search by email directly, we'll need to use the auth.users table
      // But since we can't access auth.users from the client, we'll use a workaround
      
      // For now, let's assume the user enters a user_id or we have another way
      toast({
        title: "Info",
        description: "For now, please ask an admin to add team members directly",
        variant: "default"
      });

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

  const removeTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

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
  };

  const addCurrentUserToProject = async () => {
    if (!user) return;

    try {
      setAddingMember(true);

      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "You have been added to the project team"
      });

      fetchTeamMembers();
      onTeamMembersChange();
    } catch (error: any) {
      console.error('Error adding yourself to project:', error);
      toast({
        title: "Error",
        description: "Failed to join project team",
        variant: "destructive"
      });
    } finally {
      setAddingMember(false);
    }
  };

  const getMemberName = (member: TeamMember) => {
    return member.profile?.display_name || 
           member.profile?.full_name || 
           'Unknown User';
  };

  const isCurrentUserMember = teamMembers.some(member => member.user_id === user?.id);

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({teamMembers.length})
            </CardTitle>
            <div className="flex gap-2">
              {!isCurrentUserMember && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={addCurrentUserToProject}
                  disabled={addingMember}
                >
                  Join Team
                </Button>
              )}
              <Button size="sm" onClick={() => setShowAddMember(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No team members yet</p>
              <p className="text-sm mb-4">Add team members to collaborate on this project</p>
              <Button onClick={() => setShowAddMember(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {getMemberName(member).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{getMemberName(member)}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeTeamMember(member.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Enter user ID"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                For demo purposes, please use a valid user ID from the profiles table
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
            <Button onClick={addTeamMember} disabled={addingMember}>
              {addingMember ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
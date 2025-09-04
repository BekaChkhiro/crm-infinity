import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Activity, Filter, Search, FileText, Users, Calendar, CheckCircle, Upload, UserPlus, UserMinus, Edit, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/core/config/client';
import { useToast } from '@/shared/hooks/use-toast';

interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string | null;
  activity_type: string;
  description: string;
  metadata: any;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ActivityFeedProps {
  projectId: string;
  teamMembers: Array<{ id: string; name: string }>;
}

const activityConfig = {
  task_created: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    label: 'Task Created'
  },
  task_updated: {
    icon: Edit,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    label: 'Task Updated'
  },
  task_deleted: {
    icon: Trash2,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    label: 'Task Deleted'
  },
  file_uploaded: {
    icon: Upload,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    label: 'File Uploaded'
  },
  member_added: {
    icon: UserPlus,
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    label: 'Member Added'
  },
  member_removed: {
    icon: UserMinus,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    label: 'Member Removed'
  },
  member_role_changed: {
    icon: Users,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    label: 'Role Changed'
  },
  event_created: {
    icon: Calendar,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    label: 'Event Created'
  }
};

export function ActivityFeed({ projectId, teamMembers }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('project-activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activity',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('project_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        // Get profile information for users who performed activities
        const userIds = data
          .filter(activity => activity.user_id)
          .map(activity => activity.user_id!);
        
        if (userIds.length > 0) {
          const uniqueUserIds = [...new Set(userIds)];
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, display_name, full_name, avatar_url')
            .in('user_id', uniqueUserIds);

          if (profilesError) throw profilesError;

          const activitiesWithProfiles = data.map(activity => ({
            ...activity,
            profile: activity.user_id ? profiles?.find(p => p.user_id === activity.user_id) : null
          }));

          setActivities(activitiesWithProfiles);
        } else {
          setActivities(data);
        }
      } else {
        setActivities([]);
      }
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      toast({
        title: "Error",
        description: "Failed to load activity feed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (activity: ProjectActivity) => {
    if (!activity.profile) return 'System';
    return activity.profile.display_name || 
           activity.profile.full_name || 
           'Unknown User';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchTerm === '' || 
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(activity).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || activity.activity_type === filterType;
    
    const matchesMember = filterMember === 'all' || 
      (filterMember === 'system' ? !activity.user_id : activity.user_id === filterMember);
    
    return matchesSearch && matchesType && matchesMember;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Loading activity feed...</p>
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
              <Activity className="h-5 w-5" />
              Project Activity
            </CardTitle>
            <Badge variant="outline">
              {filteredActivities.length} activities
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(activityConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                <SelectItem value="system">System</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity List */}
          {filteredActivities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {activities.length === 0 ? (
                <div>
                  <p className="text-lg font-medium">No activity yet</p>
                  <p className="text-sm">Project activities will appear here</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">No activities match your filters</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const config = activityConfig[activity.activity_type as keyof typeof activityConfig];
                const ActivityIcon = config?.icon || FileText;
                const userName = getUserName(activity);
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-full ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                        <ActivityIcon className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {activity.user_id ? (
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(userName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{userName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                <Activity className="h-3 w-3" />
                              </div>
                              <span className="font-medium text-sm text-muted-foreground">System</span>
                            </div>
                          )}
                          {config && (
                            <Badge variant="secondary" className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      
                      <p className="text-sm text-foreground mt-1">
                        {activity.description}
                      </p>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.created_at), 'MMM dd, yyyy - HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
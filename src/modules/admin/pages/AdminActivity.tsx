import React, { useState, useEffect } from 'react';
import { supabase } from '@/core/config/client';
import { AdminLayout } from '@/modules/admin/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Activity, Users, Database, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityEvent {
  id: string;
  type: 'user_registration' | 'project_created' | 'user_added_to_project';
  description: string;
  timestamp: string;
  user_name?: string;
  project_name?: string;
}

export default function AdminActivity() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'users' | 'projects'>('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Get recent user registrations
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('display_name, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent projects
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Convert to activity events
      const userActivities: ActivityEvent[] = (recentUsers || []).map(user => ({
        id: `user-${user.created_at}`,
        type: 'user_registration',
        description: `New user registered: ${user.display_name || user.full_name || 'Unknown User'}`,
        timestamp: user.created_at,
        user_name: user.display_name || user.full_name
      }));

      const projectActivities: ActivityEvent[] = (recentProjects || []).map(project => ({
        id: `project-${project.created_at}`,
        type: 'project_created',
        description: `New project created: ${project.name}`,
        timestamp: project.created_at,
        project_name: project.name
      }));

      // Combine and sort by timestamp
      const allActivities = [...userActivities, ...projectActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(allActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'users') return activity.type === 'user_registration';
    if (filter === 'projects') return activity.type === 'project_created' || activity.type === 'user_added_to_project';
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4" />;
      case 'project_created':
        return <Database className="h-4 w-4" />;
      case 'user_added_to_project':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_registration':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'project_created':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'user_added_to_project':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Activity</h1>
            <p className="text-muted-foreground">
              Monitor recent system events and user activity
            </p>
          </div>
          <Button onClick={fetchActivities} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Activity Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                All Activity
              </Button>
              <Button
                variant={filter === 'users' ? 'default' : 'outline'}
                onClick={() => setFilter('users')}
                size="sm"
              >
                <Users className="h-4 w-4 mr-1" />
                Users
              </Button>
              <Button
                variant={filter === 'projects' ? 'default' : 'outline'}
                onClick={() => setFilter('projects')}
                size="sm"
              >
                <Database className="h-4 w-4 mr-1" />
                Projects
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredActivities.length > 0 ? (
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.description}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity found</p>
                <p className="text-sm">Activity will appear here as users interact with the system</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
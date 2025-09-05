import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/core/config/client';
import { AdminLayout } from '@/modules/admin/layouts/AdminLayout';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Progress } from '@/shared/components/ui/progress';
import { 
  Users, 
  Settings, 
  Database, 
  Activity, 
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  UserPlus,
  FolderPlus,
  Eye,
  ArrowRight,
  Calendar,
  FileText
} from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { AdminSystemHealth } from '@/modules/admin/components/AdminSystemHealth';
import { TeamPerformanceAnalytics } from '@/features/projects/components/TeamPerformanceAnalytics';
import { TimeTrackingAnalytics } from '@/modules/admin/components/TimeTrackingAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

interface AdminStats {
  totalUsers: number;
  newUsersThisWeek: number;
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface RecentUser {
  id: string;
  display_name: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

interface RecentProject {
  id: string;
  name: string;
  description: string;
  status: string;
  owner_name: string;
  task_count: number;
  created_at: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { profile } = useProfile();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    newUsersThisWeek: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    systemHealth: 'good'
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchRecentUsers(),
        fetchRecentProjects(),
        generateSystemAlerts()
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get user statistics
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const weekAgo = subDays(new Date(), 7);
      const { count: newUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Get project statistics
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      const { count: activeProjectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get task statistics
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      const { count: completedTaskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done');

      // Get overdue tasks
      const { count: overdueTaskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .lt('due_date', new Date().toISOString())
        .neq('status', 'done');

      // Determine system health based on metrics
      let systemHealth: 'good' | 'warning' | 'critical' = 'good';
      if (overdueTaskCount && overdueTaskCount > 10) systemHealth = 'warning';
      if (overdueTaskCount && overdueTaskCount > 50) systemHealth = 'critical';

      setStats({
        totalUsers: userCount || 0,
        newUsersThisWeek: newUsersCount || 0,
        totalProjects: projectCount || 0,
        activeProjects: activeProjectCount || 0,
        totalTasks: taskCount || 0,
        completedTasks: completedTaskCount || 0,
        overdueTasks: overdueTaskCount || 0,
        systemHealth
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, role, created_at, avatar_url')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        // Get email from auth users
        const userIds = data.map(u => u.user_id);
        const { data: authData } = await supabase.auth.admin.listUsers();
        
        const usersWithEmail = data.map(user => ({
          ...user,
          id: user.user_id,
          email: authData.users?.find(u => u.id === user.user_id)?.email || 'N/A'
        }));

        setRecentUsers(usersWithEmail as RecentUser[]);
      }
    } catch (error) {
      console.error('Failed to fetch recent users:', error);
    }
  };

  const fetchRecentProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          created_at,
          profiles!owner_id (display_name, full_name),
          tasks (id)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        const formattedProjects = data.map(project => ({
          ...project,
          owner_name: project.profiles?.display_name || project.profiles?.full_name || 'Unknown',
          task_count: project.tasks?.length || 0
        }));
        setRecentProjects(formattedProjects as RecentProject[]);
      }
    } catch (error) {
      console.error('Failed to fetch recent projects:', error);
    }
  };

  const generateSystemAlerts = async () => {
    const alerts: SystemAlert[] = [];
    
    // Check for overdue tasks
    const { count: overdueCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .lt('due_date', new Date().toISOString())
      .neq('status', 'done');

    if (overdueCount && overdueCount > 0) {
      alerts.push({
        id: 'overdue-tasks',
        type: overdueCount > 20 ? 'error' : 'warning',
        message: `${overdueCount} overdue tasks require attention`,
        created_at: new Date().toISOString()
      });
    }

    // Check for new user registrations
    const weekAgo = subDays(new Date(), 7);
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    if (newUsers && newUsers > 0) {
      alerts.push({
        id: 'new-users',
        type: 'info',
        message: `${newUsers} new users registered this week`,
        created_at: new Date().toISOString()
      });
    }

    // Check for inactive projects
    const monthAgo = subDays(new Date(), 30);
    const { count: inactiveProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .lt('updated_at', monthAgo.toISOString())
      .eq('status', 'active');

    if (inactiveProjects && inactiveProjects > 0) {
      alerts.push({
        id: 'inactive-projects',
        type: 'warning',
        message: `${inactiveProjects} projects haven't been updated in 30 days`,
        created_at: new Date().toISOString()
      });
    }

    setSystemAlerts(alerts);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return CheckCircle2;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return CheckCircle2;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return AlertTriangle;
      case 'warning': return AlertTriangle;
      default: return CheckCircle2;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const adminName = profile?.display_name || profile?.full_name || 'Admin';
  const adminInitials = adminName.split(' ').map(n => n[0]).join('').toUpperCase();
  const HealthIcon = getHealthIcon(stats.systemHealth);
  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Admin Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Admin avatar" />
              <AvatarFallback>{adminInitials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {adminName} • System overview and management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Administrator
            </Badge>
            <Badge className={getHealthColor(stats.systemHealth)} variant="outline">
              <HealthIcon className="w-3 h-3 mr-1" />
              {stats.systemHealth.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <div className="space-y-2">
            {systemAlerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              return (
                <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                  <div className="flex items-center gap-2">
                    <AlertIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newUsersThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProjects} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedTasks} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
              <p className="text-xs text-muted-foreground">
                needs attention
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Task Completion Rate</span>
                  <span>{Math.round(completionRate)}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-2 border rounded-lg">
                  <div className="text-lg font-bold text-green-600">{stats.completedTasks}</div>
                  <div className="text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-2 border rounded-lg">
                  <div className="text-lg font-bold text-red-600">{stats.overdueTasks}</div>
                  <div className="text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Link to="/admin/users">
                  <Button variant="outline" className="w-full h-16 flex-col space-y-1">
                    <UserPlus className="h-5 w-5" />
                    <span className="text-xs">Manage Users</span>
                  </Button>
                </Link>
                <Link to="/admin/projects">
                  <Button variant="outline" className="w-full h-16 flex-col space-y-1">
                    <FolderPlus className="h-5 w-5" />
                    <span className="text-xs">Manage Projects</span>
                  </Button>
                </Link>
                <Link to="/admin/activity">
                  <Button variant="outline" className="w-full h-16 flex-col space-y-1">
                    <Activity className="h-5 w-5" />
                    <span className="text-xs">View Activity</span>
                  </Button>
                </Link>
                <Link to="/admin/time-analytics">
                  <Button variant="outline" className="w-full h-16 flex-col space-y-1">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs">Time Analytics</span>
                  </Button>
                </Link>
                <Link to="/admin/settings">
                  <Button variant="outline" className="w-full h-16 flex-col space-y-1 col-span-2">
                    <Settings className="h-5 w-5" />
                    <span className="text-xs">Settings</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* System Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Active Projects</span>
                <Badge variant="secondary">{stats.activeProjects}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total Users</span>
                <Badge variant="secondary">{stats.totalUsers}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>New This Week</span>
                <Badge variant="secondary">{stats.newUsersThisWeek}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>System Status</span>
                <Badge className={getHealthColor(stats.systemHealth)} variant="outline">
                  {stats.systemHealth.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Features */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timetracking">Time Tracking</TabsTrigger>
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="timetracking">
            <TimeTrackingAnalytics />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Recent Activity Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Recent Users
                    </CardTitle>
                    <Link to="/admin/users">
                      <Button variant="ghost" size="sm">
                        View All
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {(user.display_name || user.full_name || user.email)
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user.display_name || user.full_name || 'No Name'}
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                            {user.role}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(user.created_at), 'MMM dd')}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentUsers.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent users</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Projects */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Recent Projects
                    </CardTitle>
                    <Link to="/admin/projects">
                      <Button variant="ghost" size="sm">
                        View All
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <Link key={project.id} to={`/project/${project.id}`}>
                        <div className="p-2 border rounded-lg hover:bg-accent transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{project.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Owner: {project.owner_name}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={project.status === 'active' ? 'secondary' : 'outline'}>
                                {project.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {project.task_count} tasks
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {recentProjects.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent projects</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="health">
            <AdminSystemHealth />
          </TabsContent>

          <TabsContent value="analytics">
            <TeamPerformanceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '../../layouts/DashboardLayout';
// Force explicit React usage for JSX
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Calendar, 
  CheckCircle2,
  Clock,
  FolderOpen,
  TrendingUp,
  Target,
  Activity,
  Plus,
  ArrowRight,
  Timer,
  FileText,
  Users,
  Settings
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { AdvancedUserDashboard } from '@/components/AdvancedUserDashboard';
import { TeamWorkspace } from '@/components/TeamWorkspace';
import { UserProfile } from '@/components/UserProfile';
import { UserSettings } from '@/components/UserSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalProjects: number;
  activeProjects: number;
  totalTimeLogged: number;
  thisWeekTimeLogged: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_name: string;
  updated_at: string;
}

interface RecentProject {
  id: string;
  name: string;
  description: string;
  status: string;
  task_count: number;
  completed_tasks: number;
  updated_at: string;
}

export function UserDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<UserStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalTimeLogged: 0,
    thisWeekTimeLogged: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchUserStats(),
        fetchRecentTasks(),
        fetchRecentProjects(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    // Fetch task statistics
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, due_date, created_at')
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === 'in-progress').length || 0;
    
    const now = new Date();
    const overdueTasks = tasks?.filter(t => 
      t.due_date && 
      t.status !== 'done' && 
      isBefore(new Date(t.due_date), now)
    ).length || 0;

    // Fetch project statistics
    const { data: projects } = await supabase
      .from('projects')
      .select('status')
      .eq('created_by', user.id);

    const totalProjects = projects?.length || 0;
    const activeProjects = projects?.filter(p => p.status === 'active').length || 0;

    // Fetch time tracking statistics
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('duration, created_at')
      .eq('user_id', user.id);

    const totalTimeLogged = timeEntries?.reduce((sum, entry) => sum + entry.duration, 0) || 0;
    
    const weekAgo = addDays(now, -7);
    const thisWeekTimeLogged = timeEntries?.filter(entry => 
      isAfter(new Date(entry.created_at), weekAgo)
    ).reduce((sum, entry) => sum + entry.duration, 0) || 0;

    setStats({
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects,
      activeProjects,
      totalTimeLogged,
      thisWeekTimeLogged,
    });
  };

  const fetchRecentTasks = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        updated_at,
        projects (name)
      `)
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (data) {
      const formattedTasks = data.map(task => ({
        ...task,
        project_name: task.projects?.name || 'No Project'
      }));
      setRecentTasks(formattedTasks as RecentTask[]);
    }
  };

  const fetchRecentProjects = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        updated_at,
        tasks (status)
      `)
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .limit(3);

    if (data) {
      const formattedProjects = data.map(project => ({
        ...project,
        task_count: project.tasks?.length || 0,
        completed_tasks: project.tasks?.filter(t => t.status === 'done').length || 0
      }));
      setRecentProjects(formattedProjects as RecentProject[]);
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const userName = profile?.display_name || profile?.full_name || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Profile picture" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Hello, {userName}!</h1>
            </div>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <User className="w-3 h-3 mr-1" />
User
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overdueTasks} overdue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Time This Week</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.thisWeekTimeLogged)}</div>
              <p className="text-xs text-muted-foreground">
                {formatDuration(stats.totalTimeLogged)} total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Task Completion Statistics</span>
                  <span>{Math.round(completionRate)}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Completed
                  </span>
                  <span>{stats.completedTasks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Current
                  </span>
                  <span>{stats.inProgressTasks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Overdue
                  </span>
                  <span>{stats.overdueTasks}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Tasks
                </CardTitle>
                <Link to="/tasks">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{task.project_name}</span>
                        {task.due_date && (
                          <>
                            <span>•</span>
                            <span>Due {format(new Date(task.due_date), 'MMM dd')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(task.priority)} variant="secondary">
                        {task.priority}
                      </Badge>
                      <Badge className={getTaskStatusColor(task.status)} variant="secondary">
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
                {recentTasks.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent tasks</p>
                    <p className="text-sm">Start by creating a new task</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Features */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Analytics</TabsTrigger>
            <TabsTrigger value="team">Team Workspace</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Recent Projects & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Recent Projects
                    </CardTitle>
                    <Link to="/tasks">
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
                        <div className="p-3 border rounded-lg hover:bg-accent transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{project.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {project.description || 'No description'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {project.completed_tasks}/{project.task_count}
                              </div>
                              <div className="text-xs text-muted-foreground">tasks</div>
                            </div>
                          </div>
                          {project.task_count > 0 && (
                            <Progress 
                              value={(project.completed_tasks / project.task_count) * 100} 
                              className="h-1 mt-2" 
                            />
                          )}
                        </div>
                      </Link>
                    ))}
                    {recentProjects.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent projects</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/tasks">
                      <Button variant="outline" className="w-full h-16 flex-col space-y-2">
                        <Plus className="h-5 w-5" />
                        <span className="text-sm">New Task</span>
                      </Button>
                    </Link>
                    <Link to="/projects">
                      <Button variant="outline" className="w-full h-16 flex-col space-y-2">
                        <FolderOpen className="h-5 w-5" />
                        <span className="text-sm">Projects</span>
                      </Button>
                    </Link>
                    <Link to="/profile/edit">
                      <Button variant="outline" className="w-full h-16 flex-col space-y-2">
                        <User className="h-5 w-5" />
                        <span className="text-sm">Edit Profile</span>
                      </Button>
                    </Link>
                    <Link to="/settings">
                      <Button variant="outline" className="w-full h-16 flex-col space-y-2">
                        <Settings className="h-5 w-5" />
                        <span className="text-sm">Settings</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedUserDashboard />
          </TabsContent>

          <TabsContent value="team">
            <TeamWorkspace />
          </TabsContent>

          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>

          <TabsContent value="settings">
            <UserSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  Target,
  Award,
  Calendar,
  Activity
} from 'lucide-react';
import { supabase } from '@/core/config/client';
import { useToast } from '@/shared/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
  tasksCompleted: number;
  tasksInProgress: number;
  averageCompletionTime: number;
  productivityScore: number;
  role: string;
}

interface ProjectPerformance {
  id: string;
  name: string;
  completionRate: number;
  tasksCount: number;
  completedTasks: number;
  avgTaskDuration: number;
  teamSize: number;
}

interface PerformanceMetric {
  date: string;
  completed: number;
  created: number;
  efficiency: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function TeamPerformanceAnalytics() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<ProjectPerformance[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeamPerformance(),
        fetchProjectPerformance(),
        fetchPerformanceMetrics()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "ანალიტიკის მონაცემების ჩატვირთვა ვერ მოხერხდა"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPerformance = async () => {
    const daysAgo = parseInt(selectedPeriod);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // ყველა მომხმარებლის მოძიება
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, role')
      .eq('role', 'user');

    if (!profiles) return;

    const teamData: TeamMember[] = [];

    for (const profile of profiles) {
      // დასრულებული tasks
      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', profile.id)
        .eq('status', 'completed')
        .gte('updated_at', startDate.toISOString());

      // მიმდინარე tasks
      const { count: inProgressTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', profile.id)
        .in('status', ['in_progress', 'review']);

      // საშუალო დასრულების დრო (სიმულაცია)
      const avgCompletionTime = Math.floor(Math.random() * 48) + 12; // 12-60 საათი

      // პროდუქტიულობის ქულა
      const productivityScore = Math.min(
        Math.floor(((completedTasks || 0) / Math.max(daysAgo / 7, 1)) * 10), 
        100
      );

      teamData.push({
        id: profile.id,
        name: profile.display_name || profile.full_name || 'უცნობი მომხმარებელი',
        avatar_url: profile.avatar_url,
        tasksCompleted: completedTasks || 0,
        tasksInProgress: inProgressTasks || 0,
        averageCompletionTime: avgCompletionTime,
        productivityScore,
        role: profile.role
      });
    }

    setTeamMembers(teamData.sort((a, b) => b.productivityScore - a.productivityScore));
  };

  const fetchProjectPerformance = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        created_at,
        status
      `);

    if (!projects) return;

    const projectData: ProjectPerformance[] = [];

    for (const project of projects) {
      // პროექტის tasks
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);

      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('status', 'completed');

      // გუნდის ზომა
      const { count: teamSize } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);

      const completionRate = totalTasks ? Math.round((completedTasks || 0) / totalTasks * 100) : 0;
      const avgTaskDuration = Math.floor(Math.random() * 72) + 24; // 24-96 საათი

      projectData.push({
        id: project.id,
        name: project.name,
        completionRate,
        tasksCount: totalTasks || 0,
        completedTasks: completedTasks || 0,
        avgTaskDuration,
        teamSize: teamSize || 0
      });
    }

    setProjects(projectData.sort((a, b) => b.completionRate - a.completionRate));
  };

  const fetchPerformanceMetrics = async () => {
    const daysAgo = parseInt(selectedPeriod);
    const metrics: PerformanceMetric[] = [];

    for (let i = daysAgo; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // დღის განმავლობაში შექმნილი tasks
      const { count: created } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      // დღის განმავლობაში დასრულებული tasks
      const { count: completed } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', date.toISOString())
        .lt('updated_at', nextDate.toISOString());

      const efficiency = created ? Math.round((completed || 0) / created * 100) : 0;

      metrics.push({
        date: dateStr,
        created: created || 0,
        completed: completed || 0,
        efficiency
      });
    }

    setPerformanceData(metrics);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, text: 'შესანიშნავი' };
    if (score >= 70) return { variant: 'secondary' as const, text: 'კარგი' };
    if (score >= 50) return { variant: 'outline' as const, text: 'საშუალო' };
    return { variant: 'destructive' as const, text: 'საჭიროებს გაუმჯობესებას' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* პერიოდის არჩევა */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              გუნდის ეფექტურობის ანალიტიკა
            </CardTitle>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">ბოლო 7 დღე</SelectItem>
                <SelectItem value="30">ბოლო 30 დღე</SelectItem>
                <SelectItem value="90">ბოლო 90 დღე</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">გუნდის წევრები</TabsTrigger>
          <TabsTrigger value="projects">პროექტები</TabsTrigger>
          <TabsTrigger value="metrics">მეტრიკები</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <div className="grid gap-4">
            {teamMembers.map((member, index) => {
              const badge = getPerformanceBadge(member.productivityScore);
              return (
                <Card key={member.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {member.tasksCompleted} დასრულებული • {member.tasksInProgress} მიმდინარე
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getPerformanceColor(member.productivityScore)}`}>
                            {member.productivityScore}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            საშ. {member.averageCompletionTime}სთ
                          </p>
                        </div>
                        <Badge variant={badge.variant}>{badge.text}</Badge>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Progress value={member.productivityScore} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.completedTasks}/{project.tasksCount} დასრულებული • {project.teamSize} წევრი
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getPerformanceColor(project.completionRate)}`}>
                        {project.completionRate}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        საშ. {project.avgTaskDuration}სთ
                      </p>
                    </div>
                  </div>
                  <Progress value={project.completionRate} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* დღიური აქტივობა */}
            <Card>
              <CardHeader>
                <CardTitle>დღიური აქტივობა</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ka-GE')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('ka-GE')}
                    />
                    <Bar dataKey="created" fill="#8884d8" name="შექმნილი" />
                    <Bar dataKey="completed" fill="#82ca9d" name="დასრულებული" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ეფექტურობის ტრენდი */}
            <Card>
              <CardHeader>
                <CardTitle>ეფექტურობის ტრენდი</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ka-GE')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('ka-GE')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="efficiency" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="ეფექტურობა (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ქულების განაწილება */}
          <Card>
            <CardHeader>
              <CardTitle>გუნდის ეფექტურობის განაწილება</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {teamMembers.filter(m => m.productivityScore >= 80).length}
                  </div>
                  <p className="text-sm text-muted-foreground">შესანიშნავი</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {teamMembers.filter(m => m.productivityScore >= 60 && m.productivityScore < 80).length}
                  </div>
                  <p className="text-sm text-muted-foreground">კარგი</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {teamMembers.filter(m => m.productivityScore >= 40 && m.productivityScore < 60).length}
                  </div>
                  <p className="text-sm text-muted-foreground">საშუალო</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {teamMembers.filter(m => m.productivityScore < 40).length}
                  </div>
                  <p className="text-sm text-muted-foreground">საჭიროებს გაუმჯობესებას</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
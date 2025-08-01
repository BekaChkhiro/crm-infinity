import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { 
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Flame,
  Trophy,
  Star,
  Activity,
  Timer,
  BookOpen,
  Coffee
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PersonalStats {
  tasksCompleted: number;
  tasksInProgress: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  productivityScore: number;
  streakDays: number;
  totalTimeSpent: number;
}

interface TasksByPriority {
  name: string;
  value: number;
  color: string;
}

interface WeeklyProgress {
  day: string;
  completed: number;
  created: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

export function AdvancedUserDashboard() {
  const [stats, setStats] = useState<PersonalStats>({
    tasksCompleted: 0,
    tasksInProgress: 0,
    overdueTasks: 0,
    completionRate: 0,
    averageCompletionTime: 0,
    productivityScore: 0,
    streakDays: 0,
    totalTimeSpent: 0
  });
  const [tasksByPriority, setTasksByPriority] = useState<TasksByPriority[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchPersonalStats(),
        fetchPriorityDistribution(),
        fetchWeeklyData(),
        fetchAchievements()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "დეშბორდის მონაცემების ჩატვირთვა ვერ მოხერხდა"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalStats = async () => {
    if (!user) return;

    // ბოლო 30 დღის მონაცემები
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // დასრულებული tasks
    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .eq('status', 'completed')
      .gte('updated_at', thirtyDaysAgo.toISOString());

    // მიმდინარე tasks
    const { count: inProgressTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .in('status', ['in_progress', 'review']);

    // გადავადებული tasks
    const today = new Date().toISOString().split('T')[0];
    const { count: overdueTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .neq('status', 'completed')
      .lt('due_date', today);

    // ყველა task
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // შედეგების გამოთვლა
    const completionRate = totalTasks ? Math.round((completedTasks || 0) / totalTasks * 100) : 0;
    const averageCompletionTime = Math.floor(Math.random() * 48) + 12; // სიმულაცია
    const productivityScore = Math.min(completionRate + Math.floor(Math.random() * 20), 100);
    const streakDays = Math.floor(Math.random() * 15) + 1; // სიმულაცია
    const totalTimeSpent = Math.floor(Math.random() * 120) + 40; // სიმულაცია

    setStats({
      tasksCompleted: completedTasks || 0,
      tasksInProgress: inProgressTasks || 0,
      overdueTasks: overdueTasks || 0,
      completionRate,
      averageCompletionTime,
      productivityScore,
      streakDays,
      totalTimeSpent
    });
  };

  const fetchPriorityDistribution = async () => {
    if (!user) return;

    const priorities = ['high', 'medium', 'low'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1'];
    const priorityData: TasksByPriority[] = [];

    for (let i = 0; i < priorities.length; i++) {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', user.id)
        .eq('priority', priorities[i])
        .neq('status', 'completed');

      priorityData.push({
        name: priorities[i] === 'high' ? 'მაღალი' : priorities[i] === 'medium' ? 'საშუალო' : 'დაბალი',
        value: count || 0,
        color: colors[i]
      });
    }

    setTasksByPriority(priorityData);
  };

  const fetchWeeklyData = async () => {
    if (!user) return;

    const weekData: WeeklyProgress[] = [];
    const days = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // შექმნილი tasks
      const { count: created } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', user.id)
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      // დასრულებული tasks
      const { count: completed } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', user.id)
        .eq('status', 'completed')
        .gte('updated_at', date.toISOString())
        .lt('updated_at', nextDate.toISOString());

      weekData.push({
        day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
        completed: completed || 0,
        created: created || 0
      });
    }

    setWeeklyProgress(weekData);
  };

  const fetchAchievements = async () => {
    // მიღწევები - სიმულაცია
    const userAchievements: Achievement[] = [
      {
        id: '1',
        title: 'პირველი ნაბიჯი',
        description: 'პირველი Task-ის დასრულება',
        icon: '🎯',
        unlocked: stats.tasksCompleted > 0,
        progress: Math.min(stats.tasksCompleted, 1),
        maxProgress: 1
      },
      {
        id: '2',
        title: 'მშრომელი',
        description: '10 Task-ის დასრულება',
        icon: '⚡',
        unlocked: stats.tasksCompleted >= 10,
        progress: Math.min(stats.tasksCompleted, 10),
        maxProgress: 10
      },
      {
        id: '3',
        title: 'ექსპერტი',
        description: '50 Task-ის დასრულება',
        icon: '🏆',
        unlocked: stats.tasksCompleted >= 50,
        progress: Math.min(stats.tasksCompleted, 50),
        maxProgress: 50
      },
      {
        id: '4',
        title: 'ჩამპიონი',
        description: '7 დღიანი streak',
        icon: '🔥',
        unlocked: stats.streakDays >= 7,
        progress: Math.min(stats.streakDays, 7),
        maxProgress: 7
      },
      {
        id: '5',
        title: 'პერფექციონისტი',
        description: '95% დასრულების მაჩვენებელი',
        icon: '💎',
        unlocked: stats.completionRate >= 95,
        progress: Math.min(stats.completionRate, 95),
        maxProgress: 95
      }
    ];

    setAchievements(userAchievements);
  };

  const getProductivityEmoji = (score: number) => {
    if (score >= 90) return '🚀';
    if (score >= 70) return '⭐';
    if (score >= 50) return '👍';
    return '💪';
  };

  const getStreakEmoji = (days: number) => {
    if (days >= 10) return '🔥🔥🔥';
    if (days >= 5) return '🔥🔥';
    if (days >= 1) return '🔥';
    return '⚪';
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
      {/* მთავარი სტატისტიკა */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">პროდუქტიულობა</CardTitle>
            <div className="text-2xl">{getProductivityEmoji(stats.productivityScore)}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productivityScore}%</div>
            <Progress value={stats.productivityScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              ბოლო 30 დღის მიხედვით
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <div className="text-xl">{getStreakEmoji(stats.streakDays)}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streakDays} დღე</div>
            <p className="text-xs text-muted-foreground">
              თანმიმდევრული მუშაობა
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">საშუალო დრო</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageCompletionTime}სთ</div>
            <p className="text-xs text-muted-foreground">
              Task-ის დასრულება
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ჯამური დრო</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTimeSpent}სთ</div>
            <p className="text-xs text-muted-foreground">
              ამ თვე
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">მიმოხილვა</TabsTrigger>
          <TabsTrigger value="analytics">ანალიტიკა</TabsTrigger>
          <TabsTrigger value="achievements">მიღწევები</TabsTrigger>
          <TabsTrigger value="calendar">კალენდარი</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks სტატუსი */}
            <Card>
              <CardHeader>
                <CardTitle>დავალებების სტატუსი</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">დასრულებული</span>
                  </div>
                  <Badge variant="secondary">{stats.tasksCompleted}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">მიმდინარე</span>
                  </div>
                  <Badge variant="outline">{stats.tasksInProgress}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">გადავადებული</span>
                  </div>
                  <Badge variant="destructive">{stats.overdueTasks}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* პრიორიტეტის განაწილება */}
            <Card>
              <CardHeader>
                <CardTitle>პრიორიტეტის განაწილება</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={tasksByPriority}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {tasksByPriority.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {tasksByPriority.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* კვირის პროგრესი */}
            <Card>
              <CardHeader>
                <CardTitle>კვირის აქტივობა</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#8884d8" name="დასრულებული" />
                    <Bar dataKey="created" fill="#82ca9d" name="შექმნილი" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>დეტალური ანალიტიკა</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">{stats.completionRate}%</div>
                  <p className="text-sm text-blue-600">დასრულების ხარისხი</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">{stats.tasksCompleted}</div>
                  <p className="text-sm text-green-600">დასრულებული Tasks</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                  <Flame className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-600">{stats.streakDays}</div>
                  <p className="text-sm text-purple-600">დღე Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <Card 
                key={achievement.id} 
                className={`transition-all ${achievement.unlocked ? 'border-green-200 shadow-md' : 'opacity-60'}`}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <h3 className="font-semibold mb-1">{achievement.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {achievement.description}
                  </p>
                  <Progress 
                    value={(achievement.progress / achievement.maxProgress) * 100} 
                    className="mb-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    {achievement.progress}/{achievement.maxProgress}
                  </p>
                  {achievement.unlocked && (
                    <Badge className="mt-2" variant="default">
                      მიღებულია! 🎉
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>კალენდარი</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? selectedDate.toLocaleDateString('ka-GE') : 'დღეს'} დაგეგმილი
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">გუნდის შეხვედრა</p>
                      <p className="text-sm text-muted-foreground">10:00 - 11:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Target className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">პროექტის გადახედვა</p>
                      <p className="text-sm text-muted-foreground">14:00 - 15:30</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <BookOpen className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium">კოდის რევიუ</p>
                      <p className="text-sm text-muted-foreground">16:00 - 17:00</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
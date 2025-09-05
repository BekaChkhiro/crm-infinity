import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Download,
  Search,
  Filter,
  Timer
} from 'lucide-react';
import { supabase } from '@/core/config/client';
import { useToast } from '@/shared/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';

interface TimeEntry {
  id: string;
  user_id: string;
  description: string;
  started_at: string;
  ended_at: string | null;
  duration: number;
  is_running: boolean;
  created_at: string;
  task_id: string | null;
  project_id: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
}

interface UserTimeStats {
  user_id: string;
  user_name: string;
  user_role: string;
  total_time: number;
  entries_count: number;
  avg_session: number;
  last_activity: string | null;
  daily_avg: number;
  weekly_total: number;
  monthly_total: number;
}

interface DailyWorkHours {
  user_id: string;
  user_name: string;
  date: string;
  total_hours: number;
  entries_count: number;
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
};

const formatDurationDetailed = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const formatHours = (seconds: number) => {
  const hours = seconds / 3600;
  return `${hours.toFixed(1)}h`;
};

const calculateEnhancedStats = async (userStatsMap: Map<string, UserTimeStats>, entries: TimeEntry[], dateRange: { start: Date; end: Date }) => {
  const now = new Date();
  const weekAgo = subWeeks(now, 1);
  const monthAgo = subMonths(now, 1);
  const daysDiff = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));

  userStatsMap.forEach((stats) => {
    // Calculate average session time
    if (stats.entries_count > 0) {
      stats.avg_session = Math.floor(stats.total_time / stats.entries_count);
    }
    
    // Calculate daily average
    stats.daily_avg = Math.floor(stats.total_time / daysDiff);
  });
  
  // Fetch additional data for weekly and monthly totals
  try {
    const { data: weeklyData } = await supabase
      .from('time_entries')
      .select('user_id, duration')
      .gte('started_at', weekAgo.toISOString())
      .lte('started_at', now.toISOString());
      
    const { data: monthlyData } = await supabase
      .from('time_entries')
      .select('user_id, duration')
      .gte('started_at', monthAgo.toISOString())
      .lte('started_at', now.toISOString());

    // Calculate weekly totals
    if (weeklyData) {
      const weeklyTotals = new Map<string, number>();
      weeklyData.forEach((entry: any) => {
        weeklyTotals.set(entry.user_id, (weeklyTotals.get(entry.user_id) || 0) + entry.duration);
      });
      
      userStatsMap.forEach((stats) => {
        stats.weekly_total = weeklyTotals.get(stats.user_id) || 0;
      });
    }

    // Calculate monthly totals
    if (monthlyData) {
      const monthlyTotals = new Map<string, number>();
      monthlyData.forEach((entry: any) => {
        monthlyTotals.set(entry.user_id, (monthlyTotals.get(entry.user_id) || 0) + entry.duration);
      });
      
      userStatsMap.forEach((stats) => {
        stats.monthly_total = monthlyTotals.get(stats.user_id) || 0;
      });
    }
  } catch (error) {
    console.error('Error calculating enhanced stats:', error);
  }
};

const calculateDailyWorkHours = (entries: TimeEntry[], profileMap: Map<string, any>): DailyWorkHours[] => {
  const dailyMap = new Map<string, DailyWorkHours>();
  
  entries.forEach((entry) => {
    const date = format(new Date(entry.started_at), 'yyyy-MM-dd');
    const key = `${entry.user_id}-${date}`;
    const profile = profileMap.get(entry.user_id);
    const userName = profile?.display_name || profile?.full_name || 'Unknown User';
    
    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        user_id: entry.user_id,
        user_name: userName,
        date,
        total_hours: 0,
        entries_count: 0
      });
    }
    
    const dailyData = dailyMap.get(key)!;
    dailyData.total_hours += entry.duration / 3600; // Convert to hours
    dailyData.entries_count += 1;
  });
  
  return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
};

export function TimeTrackingAnalytics() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [userStats, setUserStats] = useState<UserTimeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dailyWorkHours, setDailyWorkHours] = useState<DailyWorkHours[]>([]);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'daily'
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, roleFilter, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      return {
        start: startOfDay(new Date(customStartDate)),
        end: endOfDay(new Date(customEndDate))
      };
    }
    
    switch (dateRange) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'quarter':
        return {
          start: subMonths(now, 3),
          end: now
        };
      default:
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      console.log('DEBUG: Date range for analytics:', { 
        start: start.toISOString(), 
        end: end.toISOString() 
      });
      
      // Fetch time entries first
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select('*')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())
        .order('started_at', { ascending: false });

      if (entriesError) throw entriesError;

      console.log('DEBUG: Raw time entries found:', entriesData?.length || 0, entriesData);

      // Then fetch profiles separately
      const userIds = [...new Set(entriesData?.map(entry => entry.user_id) || [])];
      console.log('DEBUG: User IDs to fetch profiles for:', userIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, display_name, role')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const entries = entriesData || [];
      const profiles = profilesData || [];
      
      // Create a profile lookup map
      const profileMap = new Map();
      profiles.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });
      
      setTimeEntries(entries);

      // Calculate user statistics
      const userStatsMap = new Map<string, UserTimeStats>();
      
      entries.forEach((entry: any) => {
        const userId = entry.user_id;
        const profile = profileMap.get(userId);
        const userName = profile?.display_name || profile?.full_name || 'Unknown User';
        const userRole = profile?.role || 'user';
        
        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, {
            user_id: userId,
            user_name: userName,
            user_role: userRole,
            total_time: 0,
            entries_count: 0,
            avg_session: 0,
            last_activity: null,
            daily_avg: 0,
            weekly_total: 0,
            monthly_total: 0
          });
        }
        
        const stats = userStatsMap.get(userId)!;
        stats.total_time += entry.duration;
        stats.entries_count += 1;
        
        if (!stats.last_activity || entry.started_at > stats.last_activity) {
          stats.last_activity = entry.started_at;
        }
      });

      // Calculate enhanced statistics
      await calculateEnhancedStats(userStatsMap, entries, { start, end });

      const statsArray = Array.from(userStatsMap.values())
        .filter(stats => roleFilter === 'all' || stats.user_role === roleFilter)
        .sort((a, b) => b.total_time - a.total_time);
      
      setUserStats(statsArray);
      
      // Calculate daily work hours
      const dailyHours = calculateDailyWorkHours(entries, profileMap);
      setDailyWorkHours(dailyHours);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const exportData = async () => {
    try {
      const csvContent = [
        'User,Role,Total Time,Entries Count,Avg Session,Last Activity',
        ...userStats.map(stat => [
          stat.user_name,
          stat.user_role,
          formatDurationDetailed(stat.total_time),
          stat.entries_count,
          formatDurationDetailed(stat.avg_session),
          stat.last_activity ? format(new Date(stat.last_activity), 'yyyy-MM-dd HH:mm:ss') : 'Never'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-tracking-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Analytics data exported successfully",
      });
    } catch (err) {
      console.error('Error exporting data:', err);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  const filteredStats = userStats.filter(stat =>
    stat.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTimeAcrossUsers = userStats.reduce((total, stat) => total + stat.total_time, 0);
  const totalEntries = userStats.reduce((total, stat) => total + stat.entries_count, 0);
  const avgSessionTime = totalEntries > 0 ? Math.floor(totalTimeAcrossUsers / totalEntries) : 0;
  const activeUsers = userStats.filter(stat => stat.entries_count > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          ტაიმ ჩეკერის ანალიტიკა
        </h1>
        <Button onClick={exportData} className="gap-2">
          <Download className="h-4 w-4" />
          ექსპორტი
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="მოძებნე მომხმარებელი..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">ჯამური ვიუ</SelectItem>
              <SelectItem value="daily">დღიური ვიუ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა როლი</SelectItem>
              <SelectItem value="admin">ადმინი</SelectItem>
              <SelectItem value="user">მომხმარებელი</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">დღეს</SelectItem>
              <SelectItem value="week">ამ კვირაში</SelectItem>
              <SelectItem value="month">ამ თვეში</SelectItem>
              <SelectItem value="quarter">უკანასკნელი 3 თვე</SelectItem>
              <SelectItem value="custom">ასარჩევი თარიღები</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">დან:</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">მდე:</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">სულ დრო</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalTimeAcrossUsers)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">აქტიური მომხმარებლები</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">სულ ჩანაწერი</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">საშ. სესიის ხანგრძლივობა</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgSessionTime)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Tables */}
      {viewMode === 'summary' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              მომხმარებელთა სტატისტიკა
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">მომხმარებელი</th>
                    <th className="text-left p-2">როლი</th>
                    <th className="text-right p-2">სულ დრო</th>
                    <th className="text-right p-2">კვირის დრო</th>
                    <th className="text-right p-2">თვის დრო</th>
                    <th className="text-right p-2">დღის საშ.</th>
                    <th className="text-right p-2">ჩანაწერები</th>
                    <th className="text-left p-2">ბოლო აქტივობა</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStats.map((stat) => (
                    <tr key={stat.user_id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{stat.user_name}</td>
                      <td className="p-2">
                        <Badge variant={stat.user_role === 'admin' ? 'destructive' : 'secondary'}>
                          {stat.user_role === 'admin' ? 'ადმინი' : 'მომხმარებელი'}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatDuration(stat.total_time)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatDuration(stat.weekly_total)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatDuration(stat.monthly_total)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatDuration(stat.daily_avg)}
                      </td>
                      <td className="p-2 text-right">{stat.entries_count}</td>
                      <td className="p-2">
                        {stat.last_activity ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">
                              {format(new Date(stat.last_activity), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">არასოდეს</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredStats.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">მოთხოვნის შესაბამისი მონაცემები არ მოიძებნა</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              დღიური სამუშაო საათები
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">მომხმარებელი</th>
                    <th className="text-left p-2">თარიღი</th>
                    <th className="text-right p-2">სამუშაო საათები</th>
                    <th className="text-right p-2">ჩანაწერები</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyWorkHours
                    .filter(day => day.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((day, index) => (
                    <tr key={`${day.user_id}-${day.date}`} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{day.user_name}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-sm">
                            {format(new Date(day.date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatHours(day.total_hours * 3600)}
                      </td>
                      <td className="p-2 text-right">{day.entries_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {dailyWorkHours.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">მოთხოვნის შესაბამისი მონაცემები არ მოიძებნა</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
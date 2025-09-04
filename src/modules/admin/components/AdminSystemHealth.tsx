import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { 
  Activity, 
  Users, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Server,
  HardDrive,
  Cpu,
  Wifi
} from 'lucide-react';
import { supabase } from '@/core/config/client';
import { useToast } from '@/shared/hooks/use-toast';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  threshold: number;
  icon: React.ElementType;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  created_at: string;
  resolved: boolean;
}

export function AdminSystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'down'>('operational');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemMetrics();
    fetchSystemAlerts();
    const interval = setInterval(() => {
      fetchSystemMetrics();
    }, 30000); // განახლება 30 წამში ერთხელ

    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      // მომხმარებელთა რაოდენობა
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // აქტიური პროექტები
      const { count: activeProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // ბოლო 24 საათში შექმნილი tasks
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: recentTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // ბოლო საათში აქტივობა
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);
      
      const { count: recentActivity } = await supabase
        .from('project_activity')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastHour.toISOString());

      const systemMetrics: SystemMetric[] = [
        {
          id: 'users',
          name: 'რეგისტრირებული მომხმარებლები',
          value: userCount || 0,
          unit: 'users',
          status: 'good',
          threshold: 1000,
          icon: Users
        },
        {
          id: 'projects',
          name: 'აქტიური პროექტები',
          value: activeProjects || 0,
          unit: 'projects',
          status: 'good',
          threshold: 100,
          icon: Database
        },
        {
          id: 'tasks_24h',
          name: 'ახალი Tasks (24სთ)',
          value: recentTasks || 0,
          unit: 'tasks',
          status: 'good',
          threshold: 50,
          icon: TrendingUp
        },
        {
          id: 'activity_1h',
          name: 'აქტივობა (1სთ)',
          value: recentActivity || 0,
          unit: 'actions',
          status: recentActivity && recentActivity > 10 ? 'good' : 'warning',
          threshold: 20,
          icon: Activity
        },
        {
          id: 'storage',
          name: 'შენახული ფაილები',
          value: Math.floor(Math.random() * 85), // სიმულაცია
          unit: '%',
          status: 'good',
          threshold: 90,
          icon: HardDrive
        },
        {
          id: 'performance',
          name: 'სისტემის წარმადობა',
          value: Math.floor(Math.random() * 15) + 85, // სიმულაცია
          unit: '%',
          status: 'good',
          threshold: 80,
          icon: Cpu
        }
      ];

      setMetrics(systemMetrics);
      
      // სისტემის ზოგადი სტატუსი
      const criticalMetrics = systemMetrics.filter(m => m.status === 'critical');
      const warningMetrics = systemMetrics.filter(m => m.status === 'warning');
      
      if (criticalMetrics.length > 0) {
        setSystemStatus('down');
      } else if (warningMetrics.length > 0) {
        setSystemStatus('degraded');
      } else {
        setSystemStatus('operational');
      }

    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "სისტემის მეტრიკების ჩატვირთვა ვერ მოხერხდა"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemAlerts = async () => {
    // სიმულაცია - რეალურ სისტემაში ეს იქნება რეალური მონაცემები
    const mockAlerts: SystemAlert[] = [
      {
        id: '1',
        type: 'warning',
        title: 'მაღალი მომხმარებლების აქტივობა',
        message: 'ბოლო საათში მომხმარებლების აქტივობა გაიზარდა 150%-ით',
        created_at: new Date().toISOString(),
        resolved: false
      },
      {
        id: '2',
        type: 'info',
        title: 'სისტემის განახლება',
        message: 'სისტემა წარმატებით განახლდა v2.1.0 ვერსიაზე',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        resolved: true
      }
    ];

    setAlerts(mockAlerts);
  };

  const resolveAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    
    toast({
      title: "შეტყობინება დასრულებულია",
      description: "სისტემის შეტყობინება წარმატებით მონიშნულია როგორც გადაწყვეტილი"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational': return 'ყველაფერი კარგად მუშაობს';
      case 'degraded': return 'შენელებული მუშაობა';
      case 'down': return 'სისტემა არ მუშაობს';
      default: return 'უცნობი სტატუსი';
    }
  };

  const getMetricStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
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
      {/* სისტემის ზოგადი სტატუსი */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            სისტემის მდგომარეობა
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${getStatusColor(systemStatus)}`}></div>
            <span className="text-lg font-medium">{getStatusText(systemStatus)}</span>
            <Badge variant={systemStatus === 'operational' ? 'default' : 'destructive'}>
              {systemStatus.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">მეტრიკები</TabsTrigger>
          <TabsTrigger value="alerts">შეტყობინებები</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => {
              const IconComponent = metric.icon;
              const percentage = Math.min((metric.value / metric.threshold) * 100, 100);
              
              return (
                <Card key={metric.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getMetricStatusIcon(metric.status)}
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metric.value}
                      <span className="text-sm text-muted-foreground ml-1">
                        {metric.unit}
                      </span>
                    </div>
                    <Progress value={percentage} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      ლიმიტი: {metric.threshold} {metric.unit}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">შეტყობინებები არ არის</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Card key={alert.id} className={alert.resolved ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {alert.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                        {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {alert.type === 'info' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                        <CardTitle className="text-base">{alert.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.resolved && (
                          <Badge variant="secondary">გადაწყვეტილი</Badge>
                        )}
                        <Badge variant={alert.type === 'error' ? 'destructive' : 'default'}>
                          {alert.type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('ka-GE')}
                      </span>
                      {!alert.resolved && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          მონიშვნა როგორც გადაწყვეტილი
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Progress } from '@/shared/components/ui/progress';
import { 
  Users, 
  Share,
  Eye,
  Edit,
  Clock,
  Activity,
  FileText,
  Settings,
  Target,
  Zap,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  currentTask: string | null;
  currentProject: string | null;
  tasksCompleted: number;
  productivity: number;
}

interface WorkspaceSession {
  id: string;
  type: 'screen_share' | 'pair_programming' | 'code_review';
  host_id: string;
  host_name: string;
  participants: string[];
  status: 'active' | 'ended';
  started_at: string;
  project_name?: string;
}

interface TeamProject {
  id: string;
  name: string;
  description: string;
  progress: number;
  members: number;
  dueDate: string | null;
  status: 'active' | 'completed' | 'on_hold';
}

export function TeamWorkspace() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeSessions, setActiveSessions] = useState<WorkspaceSession[]>([]);
  const [teamProjects, setTeamProjects] = useState<TeamProject[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      initializeWorkspace();
    }
  }, [user]);

  const initializeWorkspace = async () => {
    await Promise.all([
      fetchTeamMembers(),
      fetchActiveSessions(),
      fetchTeamProjects()
    ]);
  };

  const fetchTeamMembers = async () => {
    try {
      // სიმულაცია - რეალურ აპლიკაციაში ეს იქნება Supabase-დან
      const mockMembers: TeamMember[] = [
        {
          id: '1',
          name: 'ანა ღუდუშაური',
          avatar_url: null,
          status: 'online',
          lastSeen: new Date().toISOString(),
          currentTask: 'UI Design ოპტიმიზაცია',
          currentProject: 'მობაილური აპი',
          tasksCompleted: 23,
          productivity: 92
        },
        {
          id: '2', 
          name: 'გიორგი ხვედელიძე',
          avatar_url: null,
          status: 'busy',
          lastSeen: new Date(Date.now() - 300000).toISOString(),
          currentTask: 'Database მიგრაცია',
          currentProject: 'Backend მოდულები',
          tasksCompleted: 18,
          productivity: 85
        },
        {
          id: '3',
          name: 'სალომე ქართველიშვილი',
          avatar_url: null,
          status: 'away',
          lastSeen: new Date(Date.now() - 900000).toISOString(),
          currentTask: 'API ტესტირება',
          currentProject: 'ინტეგრაციები',
          tasksCompleted: 31,
          productivity: 78
        }
      ];

      setTeamMembers(mockMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      // სიმულაცია
      const mockSessions: WorkspaceSession[] = [
        {
          id: '1',
          type: 'pair_programming',
          host_id: '1',
          host_name: 'ანა ღუდუშაური',
          participants: ['2'],
          status: 'active',
          started_at: new Date(Date.now() - 1800000).toISOString(),
          project_name: 'მობაილური აპი'
        }
      ];

      setActiveSessions(mockSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTeamProjects = async () => {
    try {
      // რეალურ აპლიკაციაში Supabase-დან
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          end_date,
          tasks (status)
        `)
        .eq('status', 'active')
        .limit(5);

      if (projects) {
        const formattedProjects: TeamProject[] = projects.map(project => {
          const totalTasks = project.tasks?.length || 0;
          const completedTasks = project.tasks?.filter((t: any) => t.status === 'done').length || 0;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
            id: project.id,
            name: project.name,
            description: project.description || '',
            progress,
            members: Math.floor(Math.random() * 5) + 2, // სიმულაცია
            dueDate: project.end_date,
            status: project.status
          };
        });

        setTeamProjects(formattedProjects);
      }
    } catch (error) {
      console.error('Error fetching team projects:', error);
    }
  };

  const startScreenShare = async (targetUser?: string) => {
    toast({
      title: "ეკრანის გაზიარება დაიწყო",
      description: targetUser ? "პირადი სესია" : "გუნდური სესია",
    });
  };

  const startPairProgramming = async (targetUserId: string) => {
    toast({
      title: "წყვილური პროგრამირება",
      description: "სესია დაიწყო",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'ონლაინ';
      case 'away': return 'მოცილება';
      case 'busy': return 'დაკავებული';
      default: return 'ოფლაინ';
    }
  };

  const getProductivityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* გუნდის წევრები */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              გუნდის წევრები ({teamMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(member.status)}`}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {member.currentTask || getStatusText(member.status)}
                      </p>
                      {member.currentProject && (
                        <p className="text-xs text-muted-foreground">
                          📁 {member.currentProject}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs">{member.tasksCompleted} დასრულებული</span>
                        </div>
                        <div className={`text-xs font-medium ${getProductivityColor(member.productivity)}`}>
                          {member.productivity}% ეფექტურობა
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => startPairProgramming(member.id)}
                      disabled={member.status === 'offline'}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Pair Program
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => startScreenShare(member.id)}
                      disabled={member.status === 'offline'}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* გუნდის სტატისტიკა */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              გუნდის სტატისტიკა
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {teamMembers.filter(m => m.status === 'online').length}
              </div>
              <div className="text-sm text-green-600">ონლაინ ახლა</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {teamMembers.reduce((sum, m) => sum + m.tasksCompleted, 0)}
              </div>
              <div className="text-sm text-blue-600">სულ დასრულებული</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(teamMembers.reduce((sum, m) => sum + m.productivity, 0) / teamMembers.length)}%
              </div>
              <div className="text-sm text-purple-600">საშუალო ეფექტურობა</div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => startScreenShare()}
            >
              <Share className="h-4 w-4 mr-2" />
              გუნდური Screen Share
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* აქტიური პროექტები */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            აქტიური პროექტები
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamProjects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold truncate">{project.name}</h3>
                  <Badge variant="secondary">{project.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {project.description}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>პროგრესი</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.members} წევრი
                    </span>
                    {project.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.dueDate).toLocaleDateString('ka-GE')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* აქტიური სესიები */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              აქტიური სესიები
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium">
                        {session.type === 'screen_share' ? 'ეკრანის გაზიარება' : 
                         session.type === 'pair_programming' ? 'წყვილური პროგრამირება' : 
                         'კოდის რევიუ'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ჰოსტი: {session.host_name} • {session.participants.length} მონაწილე
                        {session.project_name && ` • ${session.project_name}`}
                      </p>
                    </div>
                  </div>
                  <Button size="sm">შეუერთება</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
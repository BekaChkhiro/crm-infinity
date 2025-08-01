import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2,
  Timer,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInSeconds, addSeconds } from 'date-fns';

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  description: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  is_running: boolean;
  created_at: string;
}

interface TimeTrackerProps {
  taskId: string;
  teamMembers: Array<{ id: string; name: string }>;
}

const timeEntrySchema = z.object({
  description: z.string().min(1, 'Description is required'),
  duration: z.string().min(1, 'Duration is required'),
  date: z.string().min(1, 'Date is required'),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

const formatDuration = (seconds: number) => {
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

const parseTimeInput = (timeString: string): number => {
  // Parse formats like "1h 30m", "90m", "1.5h", "30", etc.
  const hourMatch = timeString.match(/(\d*\.?\d+)h/);
  const minuteMatch = timeString.match(/(\d*\.?\d+)m/);
  const numberMatch = timeString.match(/^(\d*\.?\d+)$/);

  let totalMinutes = 0;

  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60;
  }
  if (minuteMatch) {
    totalMinutes += parseFloat(minuteMatch[1]);
  }
  if (numberMatch && !hourMatch && !minuteMatch) {
    totalMinutes += parseFloat(numberMatch[1]);
  }

  return totalMinutes * 60; // Convert to seconds
};

export function TimeTracker({ taskId, teamMembers }: TimeTrackerProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      description: '',
      duration: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    fetchTimeEntries();
    checkRunningTimer();
  }, [taskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && currentEntry) {
      interval = setInterval(() => {
        const now = Date.now();
        const startTime = new Date(currentEntry.start_time).getTime();
        setCurrentTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentEntry]);

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      toast({
        title: "Error",
        description: "Failed to load time entries",
        variant: "destructive"
      });
    }
  };

  const checkRunningTimer = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user?.id)
        .eq('is_running', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCurrentEntry(data);
        setIsRunning(true);
      }
    } catch (err) {
      console.error('Error checking running timer:', err);
    }
  };

  const startTimer = async (description: string = 'Working on task') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: user.id,
          description,
          start_time: new Date().toISOString(),
          is_running: true,
          duration: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setIsRunning(true);
      setCurrentTime(0);

      toast({
        title: "Timer Started",
        description: "Time tracking has begun for this task",
      });
    } catch (err) {
      console.error('Error starting timer:', err);
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive"
      });
    }
  };

  const stopTimer = async () => {
    if (!currentEntry) return;

    try {
      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime).getTime() - new Date(currentEntry.start_time).getTime()) / 1000);

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime,
          duration,
          is_running: false,
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      setIsRunning(false);
      setCurrentTime(0);
      fetchTimeEntries();

      toast({
        title: "Timer Stopped",
        description: `Time logged: ${formatDuration(duration)}`,
      });
    } catch (err) {
      console.error('Error stopping timer:', err);
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive"
      });
    }
  };

  const addManualEntry = async (data: TimeEntryFormData) => {
    if (!user) return;

    try {
      const duration = parseTimeInput(data.duration);
      const entryDate = new Date(data.date);
      
      const { error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: user.id,
          description: data.description,
          start_time: entryDate.toISOString(),
          end_time: addSeconds(entryDate, duration).toISOString(),
          duration,
          is_running: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time entry added successfully",
      });

      setDialogOpen(false);
      form.reset();
      fetchTimeEntries();
    } catch (err) {
      console.error('Error adding manual entry:', err);
      toast({
        title: "Error",
        description: "Failed to add time entry",
        variant: "destructive"
      });
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time entry deleted successfully",
      });
      
      fetchTimeEntries();
    } catch (err) {
      console.error('Error deleting entry:', err);
      toast({
        title: "Error",
        description: "Failed to delete time entry",
        variant: "destructive"
      });
    }
  };

  const totalTime = timeEntries.reduce((total, entry) => total + entry.duration, 0);
  const getUserName = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    return member?.name || 'Unknown User';
  };

  return (
    <div className="space-y-4">
      {/* Timer Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Time Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Timer Display */}
          <div className="text-center p-6 bg-muted/30 rounded-lg">
            <div className="text-4xl font-mono font-bold mb-2">
              {formatDuration(currentTime)}
            </div>
            {currentEntry && (
              <p className="text-sm text-muted-foreground mb-4">
                {currentEntry.description}
              </p>
            )}
            
            <div className="flex justify-center gap-2">
              {!isRunning ? (
                <Button onClick={() => startTimer()} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Timer
                </Button>
              ) : (
                <>
                  <Button onClick={stopTimer} variant="destructive" className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop Timer
                  </Button>
                </>
              )}
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Manual Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Time Entry</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(addManualEntry)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What did you work on?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., 1h 30m, 90m, 1.5h" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Entry</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Total Time Summary */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Total Time Logged</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {formatDuration(totalTime)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Entries
            <Badge variant="secondary">{timeEntries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(entry.start_time), 'MMM dd, yyyy')}</span>
                    <span>•</span>
                    <span>{getUserName(entry.user_id)}</span>
                    {entry.is_running && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="animate-pulse">
                          Running
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">
                    {formatDuration(entry.duration)}
                  </span>
                  
                  {!entry.is_running && entry.user_id === user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {}}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteEntry(entry.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}

            {timeEntries.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No time entries yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start tracking time to see your work hours
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
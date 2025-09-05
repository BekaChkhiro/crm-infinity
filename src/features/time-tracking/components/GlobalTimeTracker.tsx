import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
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
  Calendar,
  Coffee
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { format, differenceInSeconds, addSeconds } from 'date-fns';

interface GlobalTimeEntry {
  id: string;
  user_id: string;
  description: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  is_running: boolean;
  created_at: string;
  task_id: string | null;
  project_id: string | null;
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

  return totalMinutes * 60;
};

export function GlobalTimeTracker() {
  const [timeEntries, setTimeEntries] = useState<GlobalTimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<GlobalTimeEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
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
    if (user) {
      fetchTimeEntries();
      checkRunningTimer();
    }
  }, [user]);

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
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .is('task_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (err) {
      console.error('Error fetching global time entries:', err);
      toast({
        title: "Error",
        description: "Failed to load time entries",
        variant: "destructive"
      });
    }
  };

  const checkRunningTimer = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .is('task_id', null)
        .eq('is_running', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCurrentEntry(data);
        setIsRunning(true);
        setDescription(data.description);
      }
    } catch (err) {
      console.error('Error checking running timer:', err);
    }
  };

  const startTimer = async () => {
    if (!user) return;
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for your work",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          description: description.trim(),
          start_time: new Date().toISOString(),
          is_running: true,
          duration: 0,
          task_id: null,
          project_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setIsRunning(true);
      setCurrentTime(0);

      toast({
        title: "Timer Started",
        description: "Time tracking has begun",
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
      setDescription('');
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
          user_id: user.id,
          description: data.description,
          start_time: entryDate.toISOString(),
          end_time: addSeconds(entryDate, duration).toISOString(),
          duration,
          is_running: false,
          task_id: null,
          project_id: null,
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
  const todayEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.start_time).toDateString();
    const today = new Date().toDateString();
    return entryDate === today;
  });
  const todayTime = todayEntries.reduce((total, entry) => total + entry.duration, 0);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            გლობალური ტაიმ ჩეკერი
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-6 bg-muted/30 rounded-lg">
            <div className="text-4xl font-mono font-bold mb-2">
              {formatDuration(currentTime)}
            </div>
            
            {!isRunning ? (
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="რაზე მუშაობთ?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mb-4"
                  />
                </div>
                <Button 
                  onClick={startTimer} 
                  className="gap-2" 
                  disabled={!description.trim()}
                >
                  <Play className="h-4 w-4" />
                  დაწყება
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {currentEntry?.description}
                </p>
                <Button onClick={stopTimer} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" />
                  შეჩერება
                </Button>
              </div>
            )}
            
            <div className="mt-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    მანუალური დამატება
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ხელით დრო შეყვანა</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(addManualEntry)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>აღწერა</FormLabel>
                            <FormControl>
                              <Textarea placeholder="რაზე იმუშავეთ?" {...field} />
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
                            <FormLabel>ხანგრძლივობა</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="მაგ. 1h 30m, 90m, 1.5h" 
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
                            <FormLabel>თარიღი</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          გაუქმება
                        </Button>
                        <Button type="submit">დამატება</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-primary" />
                <span className="font-medium">დღეს</span>
              </div>
              <div className="text-lg font-bold text-primary">
                {formatDuration(todayTime)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-secondary-foreground" />
                <span className="font-medium">სულ</span>
              </div>
              <div className="text-lg font-bold">
                {formatDuration(totalTime)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            ჩანაწერები
            <Badge variant="secondary">{timeEntries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(entry.start_time), 'MMM dd, yyyy HH:mm')}</span>
                    {entry.is_running && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="animate-pulse">
                          მუშაობს
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">
                    {formatDuration(entry.duration)}
                  </span>
                  
                  {!entry.is_running && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => deleteEntry(entry.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          წაშლა
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
                <p className="text-muted-foreground">ჯერ არ გაქვთ ჩანაწერები</p>
                <p className="text-sm text-muted-foreground mt-1">
                  დაიწყეთ დრო თვალყურის დასადევად
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
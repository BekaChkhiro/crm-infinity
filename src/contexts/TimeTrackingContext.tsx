import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';

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

interface TimeTrackingContextType {
  currentEntry: TimeEntry | null;
  isRunning: boolean;
  currentTime: number;
  startTimer: (description: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  refreshRunningTimer: () => Promise<void>;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export function TimeTrackingProvider({ children }: { children: ReactNode }) {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkRunningTimer();
    }
  }, [user]); // checkRunningTimer is defined below and doesn't need to be in deps

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && currentEntry) {
      interval = setInterval(() => {
        const now = Date.now();
        const startTime = new Date(currentEntry.started_at).getTime();
        setCurrentTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentEntry]);

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
        const now = Date.now();
        const startTime = new Date(data.started_at).getTime();
        setCurrentTime(Math.floor((now - startTime) / 1000));
      }
    } catch (err) {
      console.error('Error checking running timer:', err);
    }
  };

  const startTimer = async (description: string) => {
    if (!user) return;
    if (!description.trim()) {
      throw new Error('Description is required');
    }

    // Stop any existing running timer first
    if (currentEntry && isRunning) {
      await stopTimer();
    }

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          description: description.trim(),
          started_at: new Date().toISOString(),
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
      throw err;
    }
  };

  const stopTimer = async () => {
    if (!currentEntry) return;

    try {
      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime).getTime() - new Date(currentEntry.started_at).getTime()) / 1000);

      const { error } = await supabase
        .from('time_entries')
        .update({
          ended_at: endTime,
          duration,
          is_running: false,
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

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

      setCurrentEntry(null);
      setIsRunning(false);
      setCurrentTime(0);

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
      throw err;
    }
  };

  const refreshRunningTimer = async () => {
    await checkRunningTimer();
  };

  const value = {
    currentEntry,
    isRunning,
    currentTime,
    startTimer,
    stopTimer,
    refreshRunningTimer,
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTracking() {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
}
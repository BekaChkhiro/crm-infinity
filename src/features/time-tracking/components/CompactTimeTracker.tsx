import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Play, 
  Square, 
  Timer,
  Clock
} from 'lucide-react';
import { useTimeTracking } from '@/contexts/TimeTrackingContext';

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

export function CompactTimeTracker() {
  const [description, setDescription] = useState('');
  const { currentEntry, isRunning, currentTime, startTimer, stopTimer } = useTimeTracking();

  const handleStart = async () => {
    if (!description.trim()) return;
    
    try {
      await startTimer(description);
      setDescription('');
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer();
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">ტაიმ ჩეკერი</span>
          {isRunning && (
            <Badge variant="secondary" className="animate-pulse">
              მუშაობს
            </Badge>
          )}
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-mono font-bold mb-1">
            {formatDuration(currentTime)}
          </div>
          {currentEntry && (
            <p className="text-xs text-muted-foreground truncate">
              {currentEntry.description}
            </p>
          )}
        </div>

        {!isRunning ? (
          <div className="space-y-2">
            <Input
              placeholder="რაზე მუშაობთ?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && description.trim()) {
                  handleStart();
                }
              }}
              className="text-sm"
            />
            <Button 
              onClick={handleStart}
              disabled={!description.trim()}
              className="w-full gap-2 h-8"
              size="sm"
            >
              <Play className="h-3 w-3" />
              დაწყება
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleStop}
            variant="destructive" 
            className="w-full gap-2 h-8"
            size="sm"
          >
            <Square className="h-3 w-3" />
            შეჩერება
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
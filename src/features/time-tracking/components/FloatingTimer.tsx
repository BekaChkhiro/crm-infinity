import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/shared/components/ui/dialog';
import { 
  Timer, 
  Play, 
  Square,
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

export function FloatingTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentEntry, isRunning, currentTime, startTimer, stopTimer } = useTimeTracking();

  const handleStart = async () => {
    try {
      await startTimer('სამუშაო დრო');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className={`rounded-full w-16 h-16 shadow-lg transition-all duration-300 hover:scale-110 ${
              isRunning 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-primary hover:bg-primary/90'
            }`}
            title={isRunning ? `მუშაობს: ${formatDuration(currentTime)}` : 'სამუშაო ტაიმერი'}
          >
            {isRunning ? (
              <div className="flex flex-col items-center">
                <Square className="h-6 w-6" />
                <span className="text-xs font-mono">
                  {formatDuration(currentTime)}
                </span>
              </div>
            ) : (
              <Timer className="h-8 w-8" />
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              სამუშაო ტაიმერი
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Timer Display */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-3xl font-mono font-bold mb-2">
                {formatDuration(currentTime)}
              </div>
              {currentEntry && (
                <p className="text-sm text-muted-foreground mb-2">
                  {currentEntry.description}
                </p>
              )}
              {isRunning && (
                <Badge variant="secondary">
                  მუშაობს
                </Badge>
              )}
            </div>

            {/* Controls */}
            {!isRunning ? (
              <Button 
                onClick={handleStart}
                className="w-full gap-2"
              >
                <Play className="h-4 w-4" />
                ჩართვა
              </Button>
            ) : (
              <Button 
                onClick={handleStop}
                variant="destructive" 
                className="w-full gap-2"
              >
                <Square className="h-4 w-4" />
                გათიშვა
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
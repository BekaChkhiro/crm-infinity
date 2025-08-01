import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Keyboard, Navigation, Edit, Eye, MousePointer } from 'lucide-react';
import { useKeyboardShortcuts, getShortcutDisplay, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { shortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    const handleShortcutEvent = (event: CustomEvent) => {
      if (event.detail.action === 'show-shortcuts') {
        setIsOpen(true);
      }
    };

    window.addEventListener('keyboard-shortcut', handleShortcutEvent as EventListener);
    return () => {
      window.removeEventListener('keyboard-shortcut', handleShortcutEvent as EventListener);
    };
  }, []);

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const contexts = shortcut.context || ['global'];
    contexts.forEach(context => {
      if (!groups[context]) {
        groups[context] = [];
      }
      groups[context].push(shortcut);
    });
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  const contextInfo = {
    global: {
      title: 'Global Shortcuts',
      description: 'Available anywhere in the application',
      icon: Navigation
    },
    tasks: {
      title: 'Task Management',
      description: 'Available on task and project pages',
      icon: Edit
    },
    kanban: {
      title: 'Kanban Board',
      description: 'Available on kanban board views',
      icon: MousePointer
    },
    'task-panel': {
      title: 'Task Panel',
      description: 'Available when task panel is open',
      icon: Eye
    }
  };

  const ShortcutItem = ({ shortcut }: { shortcut: KeyboardShortcut }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{shortcut.description}</span>
      <Badge variant="outline" className="font-mono text-xs">
        {getShortcutDisplay(shortcut)}
      </Badge>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto">
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(contextInfo).map(([context, info]) => (
                <TabsTrigger key={context} value={context} className="flex items-center gap-2">
                  <info.icon className="h-3 w-3" />
                  {info.title.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(groupedShortcuts).map(([context, contextShortcuts]) => {
              const info = contextInfo[context as keyof typeof contextInfo];
              if (!info) return null;

              return (
                <TabsContent key={context} value={context} className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <info.icon className="h-5 w-5" />
                        {info.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {contextShortcuts.map((shortcut, index) => (
                          <div key={index}>
                            <ShortcutItem shortcut={shortcut} />
                            {index < contextShortcuts.length - 1 && (
                              <Separator className="my-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          {/* Quick Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <strong>Ctrl + /</strong> or <strong>?</strong> - Show this help dialog from anywhere
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <strong>Escape</strong> - Close dialogs, panels, or clear focus from inputs
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  Shortcuts are disabled when typing in text fields - press <strong>Escape</strong> first
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  On Mac, use <strong>Cmd</strong> instead of <strong>Ctrl</strong> for shortcuts
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
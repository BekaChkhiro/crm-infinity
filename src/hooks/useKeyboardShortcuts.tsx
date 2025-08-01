import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalTaskEdit } from '@/contexts/GlobalTaskEditContext';
import { useToast } from '@/hooks/use-toast';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  context?: string[];
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { openTaskEdit, closeTaskEdit, state } = useGlobalTaskEdit();
  const { toast } = useToast();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'd',
      ctrl: true,
      description: 'Go to Dashboard',
      action: () => navigate('/dashboard'),
      context: ['global']
    },
    {
      key: 't',
      ctrl: true,
      description: 'Go to Tasks',
      action: () => navigate('/tasks'),
      context: ['global']
    },
    {
      key: 'p',
      ctrl: true,
      description: 'Go to Profile',
      action: () => navigate('/profile/edit'),
      context: ['global']
    },

    // Task management shortcuts
    {
      key: 'n',
      ctrl: true,
      description: 'Create New Task',
      action: () => {
        // Trigger new task creation
        const event = new CustomEvent('keyboard-shortcut', { 
          detail: { action: 'create-task' } 
        });
        window.dispatchEvent(event);
      },
      context: ['tasks', 'kanban']
    },
    {
      key: 'f',
      ctrl: true,
      description: 'Focus Search',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      context: ['tasks', 'kanban']
    },
    {
      key: 'Escape',
      description: 'Close Task Panel / Clear Selection',
      action: () => {
        if (state.isOpen) {
          closeTaskEdit();
        } else {
          // Clear any focus or selection
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement) {
            activeElement.blur();
          }
        }
      },
      context: ['global']
    },

    // Task panel shortcuts
    {
      key: 'e',
      ctrl: true,
      description: 'Edit Current Task',
      action: () => {
        if (state.isOpen && state.mode === 'view') {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'edit-task' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },
    {
      key: 's',
      ctrl: true,
      description: 'Save Task Changes',
      action: () => {
        if (state.isOpen && state.mode === 'edit') {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'save-task' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },

    // Tab navigation in task panel
    {
      key: '1',
      ctrl: true,
      description: 'Switch to Details Tab',
      action: () => {
        if (state.isOpen) {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'switch-tab', tab: 'details' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },
    {
      key: '2',
      ctrl: true,
      description: 'Switch to Subtasks Tab',
      action: () => {
        if (state.isOpen) {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'switch-tab', tab: 'subtasks' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },
    {
      key: '3',
      ctrl: true,
      description: 'Switch to Comments Tab',
      action: () => {
        if (state.isOpen) {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'switch-tab', tab: 'comments' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },
    {
      key: '4',
      ctrl: true,
      description: 'Switch to Files Tab',
      action: () => {
        if (state.isOpen) {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'switch-tab', tab: 'files' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },
    {
      key: '5',
      ctrl: true,
      description: 'Switch to Time Tab',
      action: () => {
        if (state.isOpen) {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'switch-tab', tab: 'time' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },
    {
      key: '6',
      ctrl: true,
      description: 'Switch to Activity Tab',
      action: () => {
        if (state.isOpen) {
          const event = new CustomEvent('keyboard-shortcut', { 
            detail: { action: 'switch-tab', tab: 'activity' } 
          });
          window.dispatchEvent(event);
        }
      },
      context: ['task-panel']
    },

    // Help shortcut
    {
      key: '?',
      shift: true,
      description: 'Show Keyboard Shortcuts',
      action: () => {
        const event = new CustomEvent('keyboard-shortcut', { 
          detail: { action: 'show-shortcuts' } 
        });
        window.dispatchEvent(event);
      },
      context: ['global']
    },

    // Quick actions
    {
      key: 'r',
      ctrl: true,
      description: 'Refresh Current View',
      action: () => {
        window.location.reload();
      },
      context: ['global']
    }
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true') {
      // Allow Escape to work even in inputs
      if (event.key === 'Escape') {
        target.blur();
        return;
      }
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !shortcut.ctrl || event.ctrlKey || event.metaKey;
      const shiftMatch = !shortcut.shift || event.shiftKey;
      const altMatch = !shortcut.alt || event.altKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts, navigate, state, closeTaskEdit]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { shortcuts };
}

export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  
  // Special key names
  const keyNames: Record<string, string> = {
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    ' ': 'Space',
  };
  
  const keyName = keyNames[shortcut.key] || shortcut.key.toUpperCase();
  parts.push(keyName);
  
  return parts.join(' + ');
}
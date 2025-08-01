import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface GlobalTaskEditState {
  isOpen: boolean;
  taskId: string | null;
  mode: 'view' | 'edit';
  returnUrl: string | null;
  selectedTab: string;
}

interface GlobalTaskEditContextType {
  state: GlobalTaskEditState;
  openTaskEdit: (taskId: string, mode?: 'view' | 'edit', tab?: string) => void;
  closeTaskEdit: () => void;
  setActiveTab: (tab: string) => void;
  setMode: (mode: 'view' | 'edit') => void;
}

const GlobalTaskEditContext = createContext<GlobalTaskEditContextType | undefined>(undefined);

interface GlobalTaskEditProviderProps {
  children: React.ReactNode;
}

export function GlobalTaskEditProvider({ children }: GlobalTaskEditProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [state, setState] = useState<GlobalTaskEditState>({
    isOpen: false,
    taskId: null,
    mode: 'view',
    returnUrl: null,
    selectedTab: 'details'
  });

  // Handle URL-based task editing
  useEffect(() => {
    const pathMatch = location.pathname.match(/\/tasks\/edit\/(.+)$/);
    if (pathMatch) {
      const taskId = pathMatch[1];
      setState(prev => ({
        ...prev,
        isOpen: true,
        taskId,
        mode: 'edit',
        returnUrl: location.state?.returnUrl || '/'
      }));
    }
  }, [location]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleShortcutEvent = (event: CustomEvent) => {
      const { action, tab } = event.detail;
      
      switch (action) {
        case 'edit-task':
          if (state.isOpen && state.mode === 'view') {
            setMode('edit');
          }
          break;
        case 'save-task':
          if (state.isOpen && state.mode === 'edit') {
            // Trigger save action
            const saveEvent = new CustomEvent('task-save');
            window.dispatchEvent(saveEvent);
          }
          break;
        case 'switch-tab':
          if (state.isOpen && tab) {
            setActiveTab(tab);
          }
          break;
      }
    };

    window.addEventListener('keyboard-shortcut', handleShortcutEvent as EventListener);
    return () => {
      window.removeEventListener('keyboard-shortcut', handleShortcutEvent as EventListener);
    };
  }, [state]);

  const openTaskEdit = (taskId: string, mode: 'view' | 'edit' = 'view', tab: string = 'details') => {
    const currentUrl = location.pathname + location.search;
    
    setState({
      isOpen: true,
      taskId,
      mode,
      returnUrl: currentUrl,
      selectedTab: tab
    });

    // Update URL for deep linking
    navigate(`/tasks/edit/${taskId}`, {
      state: { returnUrl: currentUrl },
      replace: false
    });
  };

  const closeTaskEdit = () => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      taskId: null
    }));

    // Return to previous URL
    if (state.returnUrl) {
      navigate(state.returnUrl, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const setActiveTab = (tab: string) => {
    setState(prev => ({ ...prev, selectedTab: tab }));
  };

  const setMode = (mode: 'view' | 'edit') => {
    setState(prev => ({ ...prev, mode }));
  };

  return (
    <GlobalTaskEditContext.Provider 
      value={{
        state,
        openTaskEdit,
        closeTaskEdit,
        setActiveTab,
        setMode
      }}
    >
      {children}
    </GlobalTaskEditContext.Provider>
  );
}

export function useGlobalTaskEdit() {
  const context = useContext(GlobalTaskEditContext);
  if (context === undefined) {
    throw new Error('useGlobalTaskEdit must be used within a GlobalTaskEditProvider');
  }
  return context;
}
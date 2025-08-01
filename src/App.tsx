import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { GlobalTaskEditProvider } from "@/contexts/GlobalTaskEditContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { GlobalTaskEditPanel } from "@/components/GlobalTaskEditPanel";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Tasks from "./pages/Tasks";
import ProfileEdit from "./pages/user-dashboard/ProfileEdit";
import ChangePassword from "./pages/ChangePassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminSettings from "./pages/admin/AdminSettings";
import UserProjects from "./pages/user-dashboard/UserProjects";
import ProjectDetails from "./pages/ProjectDetails";
import ProjectSettings from "./pages/ProjectSettings";
import NotFound from "./pages/NotFound";
import { RoleDashboard } from "./components/RoleDashboard";
import { UserSettings } from "./components/UserSettings";
import { AdaptiveLayout } from "./layouts/AdaptiveLayout";

const queryClient = new QueryClient();

function AppContent() {
  useKeyboardShortcuts();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <RoleDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <AdaptiveLayout>
                <Tasks />
              </AdaptiveLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/edit" 
          element={
            <ProtectedRoute>
              <AdaptiveLayout>
                <ProfileEdit />
              </AdaptiveLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/change-password" 
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <AdaptiveLayout>
                <UserSettings />
              </AdaptiveLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/projects" 
          element={
            <AdminRoute>
              <AdminProjects />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/activity" 
          element={
            <AdminRoute>
              <AdminActivity />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/settings" 
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          } 
        />
        <Route 
          path="/project/:id" 
          element={
            <ProtectedRoute>
              <AdaptiveLayout>
                <ProjectDetails />
              </AdaptiveLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/project/:id/settings" 
          element={
            <ProtectedRoute>
              <ProjectSettings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tasks/view/:taskId" 
          element={
            <ProtectedRoute>
              <AdaptiveLayout>
                <Tasks />
              </AdaptiveLayout>
            </ProtectedRoute>
          } 
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <AdaptiveLayout>
                <UserProjects />
              </AdaptiveLayout>
            </ProtectedRoute>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GlobalTaskEditPanel />
      <KeyboardShortcutsDialog />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <ProfileProvider>
            <BrowserRouter>
              <GlobalTaskEditProvider>
                <Toaster />
                <Sonner />
                <AppContent />
              </GlobalTaskEditProvider>
            </BrowserRouter>
          </ProfileProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

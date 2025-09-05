import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { GlobalTaskEditProvider } from "@/contexts/GlobalTaskEditContext";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { FloatingTimer } from "@/features/time-tracking/components/FloatingTimer";
import { ThemeProvider } from "@/shared/components/common/ThemeProvider";
import { KeyboardShortcutsDialog } from "@/shared/components/common/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { ProtectedRoute } from "@/core/router/ProtectedRoute";
import { AdminRoute } from "@/core/router/AdminRoute";
import { GlobalTaskEditPanel } from "@/features/tasks/components/GlobalTaskEditPanel";
import Index from "./pages/Index";
import Login from "@/features/auth/pages/Login";
import Register from "@/features/auth/pages/Register";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import Tasks from "@/features/tasks/pages/Tasks";
import ProfileEdit from "@/modules/user/pages/ProfileEdit";
import ChangePassword from "@/features/auth/pages/ChangePassword";
import AdminDashboard from "@/modules/admin/pages/AdminDashboard";
import AdminProjects from "@/modules/admin/pages/AdminProjects";
import AdminProjectDetails from "@/modules/admin/pages/AdminProjectDetails";
import AdminUsers from "@/modules/admin/pages/AdminUsers";
import AdminActivity from "@/modules/admin/pages/AdminActivity";
import AdminSettings from "@/modules/admin/pages/AdminSettings";
import AdminTimeTrackingAnalytics from "@/modules/admin/pages/AdminTimeTrackingAnalytics";
import UserProjects from "@/modules/user/pages/UserProjects";
import ProjectDetails from "@/features/projects/pages/ProjectDetails";
import ProjectSettings from "@/features/projects/pages/ProjectSettings";
import NotFound from "./pages/NotFound";
import { UserDashboard } from "@/modules/user/pages/UserDashboard";
import { UserSettings } from "@/features/profile/components/UserSettings";
import { DashboardLayout } from "@/modules/user/layouts/DashboardLayout";
import { AdminLayout } from "@/modules/admin/layouts/AdminLayout";

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
        {/* USER ROUTES - All use DashboardLayout */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Tasks />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tasks/view/:taskId" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Tasks />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UserProjects />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/project/:id" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProjectDetails />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/project/:id/settings" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProjectSettings />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/edit" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfileEdit />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UserSettings />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/change-password" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ChangePassword />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* ADMIN ROUTES - All use AdminLayout and admin paths */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/dashboard" 
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
          path="/admin/time-analytics" 
          element={
            <AdminRoute>
              <AdminTimeTrackingAnalytics />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/tasks" 
          element={
            <AdminRoute>
              <AdminLayout>
                <Tasks />
              </AdminLayout>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/project/:id" 
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminProjectDetails />
              </AdminLayout>
            </AdminRoute>
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
            <TimeTrackingProvider>
              <BrowserRouter>
                <GlobalTaskEditProvider>
                  <Toaster />
                  <Sonner />
                  <AppContent />
                  <FloatingTimer />
                </GlobalTaskEditProvider>
              </BrowserRouter>
            </TimeTrackingProvider>
          </ProfileProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

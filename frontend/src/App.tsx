import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { MeetingDetailPage } from './pages/MeetingDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { TasksPage } from './pages/TasksPage';
import { UploadPage } from './pages/UploadPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

// Development mode: Skip authentication (set to false when backend is ready)
const SKIP_AUTH = false; // Backend auth is ready, authentication enabled

function App() {
  const { isLoading, isAuthenticated } = useAuth();

  // Development mode: Show loading briefly, then allow access
  if (isLoading && !SKIP_AUTH) {
    return <div>Loading app...</div>;
  }

  return (
    <Routes>
      {/* Landing Page - Public */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Routes - Public */}
      <Route
        path="/auth"
        element={
          <AuthLayout>
            <AuthPage />
          </AuthLayout>
        }
      />

      {/* App Dashboard - Protected */}
      <Route
        path="/app"
        element={
          !SKIP_AUTH && !isAuthenticated ? (
            <Navigate to="/auth" replace />
          ) : (
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/app/meetings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MeetingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/meetings/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MeetingDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/calendar"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CalendarPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/tasks"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TasksPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/upload"
        element={
          <ProtectedRoute>
            <AppLayout>
              <UploadPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/projects"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/team"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TeamPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect based on auth status */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated || SKIP_AUTH ? "/app" : "/"} replace />} 
      />
    </Routes>
  );
}

export default App;

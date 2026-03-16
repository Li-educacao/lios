import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import AppShell from './components/AppShell';
import LandingPage from './components/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ComingSoonPage from './pages/ComingSoonPage';
import { socialMediaRoutes } from './modules/social-media/routes';
import { telegramIntelligenceRoutes } from './modules/telegram-intelligence/routes';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-lios-black">
      <span className="text-sm font-body text-lios-gray-400">Carregando...</span>
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function AppRoutes() {
  const { user, loading, isRecovery } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={user && !isRecovery ? <Navigate to="/app/social-media" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={user && !isRecovery ? <Navigate to="/app/social-media" replace /> : <LoginPage />}
        />
        <Route
          path="/forgot-password"
          element={user && !isRecovery ? <Navigate to="/app/social-media" replace /> : <ForgotPasswordPage />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />

        {/* Protected routes — nested under /app with AppShell */}
        <Route path="/app" element={<ProtectedRoute />}>
          {/* Default redirect to social-media */}
          <Route index element={<Navigate to="social-media" replace />} />

          {/* Social Media module (Carousel Creator) */}
          <Route path="social-media">
            {socialMediaRoutes}
          </Route>

          {/* Coming soon modules */}
          <Route path="campanhas" element={<ComingSoonPage moduleName="Campanhas" />} />
          <Route path="criativos" element={<ComingSoonPage moduleName="Criativos" />} />
          <Route path="midias" element={<ComingSoonPage moduleName="Mídias" />} />
          <Route path="metricas" element={<ComingSoonPage moduleName="Métricas" />} />
          <Route path="marketing/relatorios" element={<ComingSoonPage moduleName="Relatórios de Marketing" />} />
          <Route path="cursos" element={<ComingSoonPage moduleName="Cursos" />} />

          {/* Telegram Intelligence module */}
          <Route path="alunos/inteligencia">
            {telegramIntelligenceRoutes}
          </Route>
          <Route path="alunos" element={<ComingSoonPage moduleName="Alunos" />} />

          <Route path="conteudo" element={<ComingSoonPage moduleName="Conteúdo" />} />
          <Route path="pedagogico/relatorios" element={<ComingSoonPage moduleName="Relatórios Pedagógicos" />} />

          {/* Admin */}
          <Route path="admin" element={<ComingSoonPage moduleName="Administração" />} />

          {/* Catch-all inside /app */}
          <Route path="*" element={<Navigate to="social-media" replace />} />
        </Route>

        {/* Global catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AuthRoute } from './guards';

// Auth pages (eager-loaded — small, needed immediately)
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';

// Lazy-loaded app pages
const DashboardPage   = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DSAPage         = lazy(() => import('../pages/DSAPage').then(m => ({ default: m.DSAPage })));
const NotesPage       = lazy(() => import('../pages/NotesPage').then(m => ({ default: m.NotesPage })));
const PlannerPage     = lazy(() => import('../pages/PlannerPage').then(m => ({ default: m.PlannerPage })));
const JobsPage        = lazy(() => import('../pages/JobsPage').then(m => ({ default: m.JobsPage })));
const LearningPage    = lazy(() => import('../pages/LearningPage').then(m => ({ default: m.LearningPage })));
const ResourcesPage   = lazy(() => import('../pages/ResourcesPage').then(m => ({ default: m.ResourcesPage })));
const BooksPage       = lazy(() => import('../pages/BooksPage').then(m => ({ default: m.BooksPage })));
const PlacementPage   = lazy(() => import('../pages/PlacementPage').then(m => ({ default: m.PlacementPage })));
const GitHubPage      = lazy(() => import('../pages/GitHubPage').then(m => ({ default: m.GitHubPage })));
const AnalyticsPage   = lazy(() => import('../pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const GraphPage       = lazy(() => import('../pages/GraphPage').then(m => ({ default: m.GraphPage })));
const SettingsPage    = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
// V2 Pages
const ProjectsPage      = lazy(() => import('../pages/ProjectsPage'));
const InterviewsPage    = lazy(() => import('../pages/InterviewsPage'));
const HabitsPage        = lazy(() => import('../pages/HabitsPage'));
const OpportunitiesPage = lazy(() => import('../pages/OpportunitiesPage'));
const HackathonsPage    = lazy(() => import('../pages/HackathonsPage'));
const KnowledgePage     = lazy(() => import('../pages/KnowledgePage'));
const AlertsPage        = lazy(() => import('../pages/AlertsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* Auth routes — redirect to / if already logged in */}
      <Route element={<AuthRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={
          <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
        } />
        <Route path="/dsa" element={
          <Suspense fallback={<PageLoader />}><DSAPage /></Suspense>
        } />
        <Route path="/notes" element={
          <Suspense fallback={<PageLoader />}><NotesPage /></Suspense>
        } />
        <Route path="/planner" element={
          <Suspense fallback={<PageLoader />}><PlannerPage /></Suspense>
        } />
        <Route path="/jobs" element={
          <Suspense fallback={<PageLoader />}><JobsPage /></Suspense>
        } />
        <Route path="/learning" element={
          <Suspense fallback={<PageLoader />}><LearningPage /></Suspense>
        } />
        <Route path="/resources" element={
          <Suspense fallback={<PageLoader />}><ResourcesPage /></Suspense>
        } />
        <Route path="/books" element={
          <Suspense fallback={<PageLoader />}><BooksPage /></Suspense>
        } />
        <Route path="/placement" element={
          <Suspense fallback={<PageLoader />}><PlacementPage /></Suspense>
        } />
        <Route path="/github" element={
          <Suspense fallback={<PageLoader />}><GitHubPage /></Suspense>
        } />
        <Route path="/analytics" element={
          <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>
        } />
        <Route path="/graph" element={
          <Suspense fallback={<PageLoader />}><GraphPage /></Suspense>
        } />
        <Route path="/settings" element={
          <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
        } />
        {/* V2 Routes */}
        <Route path="/projects" element={
          <Suspense fallback={<PageLoader />}><ProjectsPage /></Suspense>
        } />
        <Route path="/interviews" element={
          <Suspense fallback={<PageLoader />}><InterviewsPage /></Suspense>
        } />
        <Route path="/habits" element={
          <Suspense fallback={<PageLoader />}><HabitsPage /></Suspense>
        } />
        <Route path="/opportunities" element={
          <Suspense fallback={<PageLoader />}><OpportunitiesPage /></Suspense>
        } />
        <Route path="/hackathons" element={
          <Suspense fallback={<PageLoader />}><HackathonsPage /></Suspense>
        } />
        <Route path="/knowledge" element={
          <Suspense fallback={<PageLoader />}><KnowledgePage /></Suspense>
        } />
        <Route path="/alerts" element={
          <Suspense fallback={<PageLoader />}><AlertsPage /></Suspense>
        } />
      </Route>
    </Routes>
  );
}

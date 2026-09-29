import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { GuestOnly, RequireAuth, RouteError } from '@/layouts/Guards';
import { AppLayout } from '@/layouts/AppLayout';
import { ProjectLayout } from '@/layouts/ProjectLayout';
import { RouteFallback } from '@/layouts/Loaders';

// Route-level code splitting (senior-frontend vite-spa profile: lazy routes are mandatory).
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'));
const ProjectOverviewPage = lazy(() => import('@/pages/projects/ProjectOverviewPage'));
const EvidencePage = lazy(() => import('@/pages/projects/EvidencePage'));
const TimelinePage = lazy(() => import('@/pages/projects/TimelinePage'));
const LocationsPage = lazy(() => import('@/pages/projects/LocationsPage'));
const ComparePage = lazy(() => import('@/pages/projects/ComparePage'));
const InsightsPage = lazy(() => import('@/pages/projects/InsightsPage'));
const ReportsPage = lazy(() => import('@/pages/projects/ReportsPage'));
const ReportViewPage = lazy(() => import('@/pages/projects/ReportViewPage'));
const ProjectSettingsPage = lazy(() => import('@/pages/projects/ProjectSettingsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const PublicReportPage = lazy(() => import('@/pages/public/PublicReportPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const page = (node: ReactNode) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>;

export const router = createBrowserRouter([
  { path: '/reports/:slug', element: page(<PublicReportPage />), errorElement: <RouteError /> },
  {
    element: <GuestOnly />,
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: page(<LoginPage />) },
      { path: '/register', element: page(<RegisterPage />) },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: page(<DashboardPage />) },
          { path: '/projects', element: page(<ProjectsPage />) },
          {
            path: '/projects/:projectId',
            element: <ProjectLayout />,
            children: [
              { index: true, element: page(<ProjectOverviewPage />) },
              { path: 'evidence', element: page(<EvidencePage />) },
              { path: 'timeline', element: page(<TimelinePage />) },
              { path: 'locations', element: page(<LocationsPage />) },
              { path: 'compare', element: page(<ComparePage />) },
              { path: 'insights', element: page(<InsightsPage />) },
              { path: 'reports', element: page(<ReportsPage />) },
              { path: 'reports/:reportId', element: page(<ReportViewPage />) },
              { path: 'settings', element: page(<ProjectSettingsPage />) },
            ],
          },
          { path: '/settings', element: page(<SettingsPage />) },
          { path: '*', element: page(<NotFoundPage />) },
        ],
      },
    ],
  },
]);

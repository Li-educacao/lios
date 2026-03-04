import { lazy } from 'react';
import { Route } from 'react-router-dom';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const NewCarouselPage = lazy(() => import('./pages/NewCarouselPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export const socialMediaRoutes = (
  <>
    <Route index element={<DashboardPage />} />
    <Route path="new" element={<NewCarouselPage />} />
    <Route path="carousel/:id" element={<NewCarouselPage />} />
    <Route path="templates" element={<TemplatesPage />} />
    <Route path="feedback" element={<FeedbackPage />} />
    <Route path="settings" element={<SettingsPage />} />
  </>
);

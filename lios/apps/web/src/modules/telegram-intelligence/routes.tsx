import { lazy } from 'react';
import { Route } from 'react-router-dom';

const IntelligenceDashboard = lazy(() => import('./pages/IntelligenceDashboard'));
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage'));

export const telegramIntelligenceRoutes = (
  <>
    <Route index element={<IntelligenceDashboard />} />
    <Route path=":groupId" element={<GroupDetailPage />} />
  </>
);

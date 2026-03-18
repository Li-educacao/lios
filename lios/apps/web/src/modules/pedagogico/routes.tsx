import { lazy } from 'react';
import { Route } from 'react-router-dom';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const StudentDetailPage = lazy(() => import('./pages/StudentDetailPage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const ClassDetailPage = lazy(() => import('./pages/ClassDetailPage'));

export const pedagogicoRoutes = (
  <>
    <Route index element={<DashboardPage />} />
    <Route path="alunos" element={<StudentsPage />} />
    <Route path="alunos/:id" element={<StudentDetailPage />} />
    <Route path="turmas" element={<ClassesPage />} />
    <Route path="turmas/:id" element={<ClassDetailPage />} />
  </>
);

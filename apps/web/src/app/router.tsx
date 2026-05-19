import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageFallback } from './PageFallback';

type RouterInstance = ReturnType<typeof createBrowserRouter>;

const TabletPage = lazy(() => import('@/pages/tablet/TabletPage'));
const DevComponentsPage = lazy(() => import('@/pages/dev/DevComponentsPage'));

export const router: RouterInstance = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/tablet" replace />,
  },
  {
    path: '/tablet',
    element: (
      <Suspense fallback={<PageFallback />}>
        <TabletPage />
      </Suspense>
    ),
  },
  {
    path: '/dev/components',
    element: (
      <Suspense fallback={<PageFallback />}>
        <DevComponentsPage />
      </Suspense>
    ),
  },
]);

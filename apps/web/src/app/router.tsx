import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageFallback } from './PageFallback';

type RouterInstance = ReturnType<typeof createBrowserRouter>;

const TabletPage = lazy(() => import('@/pages/tablet/TabletPage'));
const DevComponentsPage = lazy(() => import('@/pages/dev/DevComponentsPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const QuotesPage = lazy(() => import('@/pages/admin/QuotesPage'));
const CatalogPage = lazy(() => import('@/pages/admin/CatalogPage'));
const CoefsPage = lazy(() => import('@/pages/admin/CoefsPage'));

export const router: RouterInstance = createBrowserRouter([
  { path: '/', element: <Navigate to="/tablet" replace /> },
  {
    path: '/tablet',
    element: (
      <Suspense fallback={<PageFallback />}>
        <TabletPage />
      </Suspense>
    ),
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<PageFallback />}>
        <AdminLayout />
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/quotes" replace /> },
      {
        path: 'quotes',
        element: (
          <Suspense fallback={<PageFallback />}>
            <QuotesPage />
          </Suspense>
        ),
      },
      {
        path: 'catalog',
        element: (
          <Suspense fallback={<PageFallback />}>
            <CatalogPage />
          </Suspense>
        ),
      },
      {
        path: 'coefs',
        element: (
          <Suspense fallback={<PageFallback />}>
            <CoefsPage />
          </Suspense>
        ),
      },
    ],
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

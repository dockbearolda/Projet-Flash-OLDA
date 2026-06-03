import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageFallback } from './PageFallback';

type RouterInstance = ReturnType<typeof createBrowserRouter>;

const TabletPage = lazy(() => import('@/pages/tablet/TabletPage'));
const DevComponentsPage = lazy(() => import('@/pages/dev/DevComponentsPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const QuotesPage = lazy(() => import('@/pages/admin/QuotesPage'));
const CatalogPage = lazy(() => import('@/pages/admin/CatalogPage'));
const FamiliesPage = lazy(() => import('@/pages/admin/FamiliesPage'));
const CoefsPage = lazy(() => import('@/pages/admin/CoefsPage'));
const ColorsPage = lazy(() => import('@/pages/admin/ColorsPage'));
const ImpressionsPage = lazy(() => import('@/pages/admin/ImpressionsPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));

function lazyPage(El: ReturnType<typeof lazy>) {
  return (
    <Suspense fallback={<PageFallback />}>
      <El />
    </Suspense>
  );
}

export const router: RouterInstance = createBrowserRouter([
  { path: '/', element: <Navigate to="/tablet" replace /> },
  { path: '/tablet', element: lazyPage(TabletPage) },
  {
    path: '/admin',
    element: lazyPage(AdminLayout),
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
        path: 'families',
        element: (
          <Suspense fallback={<PageFallback />}>
            <FamiliesPage />
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
      { path: 'zones', element: <Navigate to="/admin/impressions" replace /> },
      {
        path: 'impressions',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ImpressionsPage />
          </Suspense>
        ),
      },
      {
        path: 'colors',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ColorsPage />
          </Suspense>
        ),
      },
      { path: 'placements', element: <Navigate to="/admin/impressions" replace /> },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageFallback />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
  { path: '/dev/components', element: lazyPage(DevComponentsPage) },
]);

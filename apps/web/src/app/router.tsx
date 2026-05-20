import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageFallback } from './PageFallback';
import { Authed } from './Authed';

type RouterInstance = ReturnType<typeof createBrowserRouter>;

const TabletPage = lazy(() => import('@/pages/tablet/TabletPage'));
const DevComponentsPage = lazy(() => import('@/pages/dev/DevComponentsPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const QuotesPage = lazy(() => import('@/pages/admin/QuotesPage'));
const CatalogPage = lazy(() => import('@/pages/admin/CatalogPage'));
const CoefsPage = lazy(() => import('@/pages/admin/CoefsPage'));
const ZonesPage = lazy(() => import('@/pages/admin/ZonesPage'));
const ColorsPage = lazy(() => import('@/pages/admin/ColorsPage'));
const PlacementsPage = lazy(() => import('@/pages/admin/PlacementsPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const LoginPage = lazy(() => import('@/pages/login/LoginPage'));

function lazyPage(El: ReturnType<typeof lazy>, guard = true) {
  const inner = (
    <Suspense fallback={<PageFallback />}>
      <El />
    </Suspense>
  );
  return guard ? <Authed>{inner}</Authed> : inner;
}

export const router: RouterInstance = createBrowserRouter([
  { path: '/', element: <Navigate to="/tablet" replace /> },
  { path: '/login', element: lazyPage(LoginPage, false) },
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
        path: 'coefs',
        element: (
          <Suspense fallback={<PageFallback />}>
            <CoefsPage />
          </Suspense>
        ),
      },
      {
        path: 'zones',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ZonesPage />
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
      {
        path: 'placements',
        element: (
          <Suspense fallback={<PageFallback />}>
            <PlacementsPage />
          </Suspense>
        ),
      },
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
  { path: '/dev/components', element: lazyPage(DevComponentsPage, false) },
]);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { Providers } from './app/providers';
import './app/globals.css';

// A deploy changes chunk file names. A tab opened before the deploy will fail
// to fetch an on-demand chunk (e.g. the PDF module) because the old file no
// longer exists on the server. Reload once to pull the fresh app shell and
// current chunks, instead of leaving the user stuck on a broken action.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'df:last-chunk-reload';
  const last = Number(sessionStorage.getItem(KEY) ?? '0');
  // Reload at most once per 10s so a genuinely missing chunk can't loop forever.
  if (Date.now() - last < 10_000) return;
  sessionStorage.setItem(KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </React.StrictMode>,
);

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

// Demande au navigateur de conserver durablement le stockage local (devis en
// cours, historique, catalogue en cache). Sans ça, les données IndexedDB peuvent
// être évincées sous pression mémoire — on ne veut rien perdre après une coupure
// de courant. Sans effet si déjà accordé (PWA installée) ou non supporté.
// `navigator.storage` est absent des vieux navigateurs : détection souple.
const storage = navigator.storage as StorageManager | undefined;
if (storage?.persist) {
  void storage.persisted().then((granted) => (granted ? true : storage.persist()));
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </React.StrictMode>,
);

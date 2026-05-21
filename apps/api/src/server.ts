console.warn('[api] boot: server.ts loading');

process.on('uncaughtException', (err) => {
  console.error('[api] uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('[api] unhandledRejection', err);
  process.exit(1);
});

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './auth.js';
import { healthRoute } from './routes/health.js';
import { authRoute } from './routes/auth.js';
import { catalogRoute } from './routes/catalog.js';
import { quotesRoute } from './routes/quotes.js';
import { pdfRoute } from './routes/pdf.js';
import { ensureCatalogSeeded } from './catalogService.js';
import path from 'node:path';
import { existsSync } from 'node:fs';

console.warn('[api] boot: imports done');

const isProd = process.env.NODE_ENV === 'production';

const app = new Hono();

app.use('*', logger());
if (!isProd) {
  app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));
}

// Auth gate (applies to all /api except health and login)
app.use('/api/*', authMiddleware);

app.route('/api/health', healthRoute);
app.route('/api/auth', authRoute);
app.route('/api/catalog', catalogRoute);
app.route('/api/quotes', quotesRoute);
app.route('/api/pdf', pdfRoute);

// Fill any missing catalogue data from the defaults (idempotent, non-blocking).
void ensureCatalogSeeded().catch((e: unknown) => {
  console.error('[api] catalog seed failed', e);
});

// Serve the SPA in production
if (isProd) {
  // Resolve relative to this file's location so cwd at startup is irrelevant.
  // Compiled layout: /app/apps/api/dist/server.js  →  /app/apps/web/dist
  const here = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.resolve(here, '../../web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
  ];
  const webDist = candidates.find((p) => existsSync(p));
  if (webDist) {
    console.warn(`[api] serving SPA from ${webDist}`);
    // Serve the built static files (hashed assets, sw.js, manifest, icons…).
    app.use('*', serveStatic({ root: webDist }));
    // SPA fallback for client-side routes (e.g. /tablet, /admin/quotes) — but
    // ONLY for navigation requests. A missing hashed asset (typically an old
    // chunk requested by a client that hasn't yet picked up a fresh deploy)
    // must return 404, never index.html: serving HTML for a ".js" request makes
    // the browser parse HTML as a module → "Failed to fetch dynamically
    // imported module", which silently breaks lazy features like PDF export.
    app.get(
      '*',
      (c, next) => {
        const p = c.req.path;
        if (p.startsWith('/assets/') || p.startsWith('/api/') || /\.[a-zA-Z0-9]+$/.test(p)) {
          return c.notFound();
        }
        return next();
      },
      serveStatic({ path: path.join(webDist, 'index.html') }),
    );
  } else {
    console.warn(`[api] SPA dist not found in [${candidates.join(', ')}] — running API-only`);
  }
}

const port = Number(process.env.PORT ?? 3001);
console.warn(`[api] boot: calling serve() on port ${String(port)} (host 0.0.0.0)`);

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.warn(`[api] listening on http://0.0.0.0:${String(info.port)}`);
});

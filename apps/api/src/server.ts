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
import path from 'node:path';
import { existsSync } from 'node:fs';

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

// Serve the SPA in production
if (isProd) {
  const webDist = path.resolve(process.cwd(), '../web/dist');
  if (existsSync(webDist)) {
    app.use('*', serveStatic({ root: webDist }));
    app.get('*', serveStatic({ path: path.join(webDist, 'index.html') }));
  } else {
    console.warn(`[api] SPA dist not found at ${webDist} — running API-only`);
  }
}

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.warn(`[api] listening on http://localhost:${String(info.port)}`);
});

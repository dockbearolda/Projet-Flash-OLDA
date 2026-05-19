import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok', service: 'devis-flash-api' }));

// Static SPA serving + other routes will be added in Étape 10
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.warn(`[api] listening on http://localhost:${String(info.port)}`);
});

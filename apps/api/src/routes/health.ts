import { Hono } from 'hono';
import { prisma } from '../db.js';

export const healthRoute = new Hono().get('/', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: 'ok', service: 'devis-flash-api', db: 'ok' });
  } catch {
    // Keep returning 200 so the platform health check passes and keeps routing
    // traffic to a server that is up; the DB being unreachable is reported in
    // the body rather than failing the whole deployment.
    return c.json({ status: 'degraded', service: 'devis-flash-api', db: 'down' });
  }
});

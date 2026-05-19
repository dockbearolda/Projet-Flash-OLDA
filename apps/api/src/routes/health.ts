import { Hono } from 'hono';
import { prisma } from '../db.js';

export const healthRoute = new Hono().get('/', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: 'ok', service: 'devis-flash-api', db: 'ok' });
  } catch {
    return c.json({ status: 'degraded', service: 'devis-flash-api', db: 'down' }, 503);
  }
});

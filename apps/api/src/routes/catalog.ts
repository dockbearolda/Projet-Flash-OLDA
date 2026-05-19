import { Hono } from 'hono';
import { prisma } from '../db.js';

export const catalogRoute = new Hono().get('/', async (c) => {
  const [products, textileColors, flockColors, placements, zones, coefs] = await Promise.all([
    prisma.product.findMany({ where: { archived: false }, orderBy: { ref: 'asc' } }),
    prisma.textileColor.findMany({ orderBy: { name: 'asc' } }),
    prisma.flockColor.findMany({ orderBy: { name: 'asc' } }),
    prisma.placement.findMany(),
    prisma.zone.findMany(),
    prisma.coef.findMany({ orderBy: { threshold: 'asc' } }),
  ]);
  return c.json({ products, textileColors, flockColors, placements, zones, coefs });
});

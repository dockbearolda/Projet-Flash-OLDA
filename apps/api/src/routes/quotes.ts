import { Hono } from 'hono';
import { z } from 'zod';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { CustomerSchema, QuoteLineSchema, TransportSchema } from '@df/shared';
import { prisma } from '../db.js';

const UpsertQuoteSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'sent', 'archived']).default('draft'),
  customer: CustomerSchema,
  transport: TransportSchema,
  revente: z.boolean(),
  lines: z.array(QuoteLineSchema).min(1),
  qtyTotal: z.number().int().min(0),
  subtotalHT: z.number(),
  transportHT: z.number(),
  tgcaHT: z.number(),
  totalHT: z.number(),
  coef: z.number(),
});

export const quotesRoute = new Hono()
  .get('/', async (c) => {
    const includeDeleted = c.req.query('deleted') === '1';
    const quotes = await prisma.quote.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return c.json({ quotes });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return c.json({ error: 'Not found' }, 404);
    return c.json({ quote });
  })
  .post('/', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = UpsertQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    }
    const d = parsed.data;
    const data: PrismaTypes.QuoteUncheckedCreateInput = {
      id: d.id,
      status: d.status,
      customerJson: d.customer,
      transport: d.transport,
      revente: d.revente,
      linesJson: d.lines,
      qtyTotal: d.qtyTotal,
      subtotalHT: d.subtotalHT,
      transportHT: d.transportHT,
      tgcaHT: d.tgcaHT,
      totalHT: d.totalHT,
      coef: d.coef,
    };
    const quote = await prisma.quote.upsert({
      where: { id: d.id },
      create: data,
      update: data,
    });
    return c.json({ quote }, 201);
  })
  .patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<{ status?: string }>();
    if (body.status && !['draft', 'sent', 'archived'].includes(body.status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }
    const data: PrismaTypes.QuoteUpdateInput = body.status ? { status: body.status } : {};
    const quote = await prisma.quote.update({ where: { id }, data }).catch(() => null);
    if (!quote) return c.json({ error: 'Not found' }, 404);
    return c.json({ quote });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const quote = await prisma.quote
      .update({ where: { id }, data: { deletedAt: new Date() } })
      .catch(() => null);
    if (!quote) return c.json({ error: 'Not found' }, 404);
    return c.json({ ok: true });
  });

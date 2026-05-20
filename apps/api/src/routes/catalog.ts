import { Hono } from 'hono';
import { z } from 'zod';
import {
  CatalogProductSchema,
  CatalogCoefSchema,
  CatalogZoneSchema,
  CatalogTextileColorSchema,
  CatalogFlockColorSchema,
  CatalogPlacementSchema,
  CatalogSettingsSchema,
} from '@df/shared';
import { prisma } from '../db.js';
import { readSnapshot, ensureCatalogSeeded } from '../catalogService.js';

function duplicates(keys: (string | number)[]): boolean {
  return new Set(keys).size !== keys.length;
}

export const catalogRoute = new Hono()
  .get('/', async (c) => {
    let snapshot = await readSnapshot();
    // Seed defaults only on a genuinely empty database.
    if (
      snapshot.products.length === 0 &&
      snapshot.coefs.length === 0 &&
      snapshot.zones.length === 0
    ) {
      await ensureCatalogSeeded();
      snapshot = await readSnapshot();
    }
    return c.json(snapshot);
  })

  .put('/products', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z.array(CatalogProductSchema).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Données produits invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map((p) => p.ref))) {
      return c.json({ error: 'Références produits en double' }, 400);
    }
    await prisma.$transaction([
      prisma.product.deleteMany({}),
      prisma.product.createMany({
        data: parsed.data.map((p) => ({
          ref: p.ref,
          supplierRef: p.supplierRef,
          name: p.name,
          family: p.family,
          priceAchat: p.priceAchat,
        })),
      }),
    ]);
    return c.json(await readSnapshot());
  })

  .put('/coefs', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z.array(CatalogCoefSchema).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Coefficients invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map(([threshold]) => threshold))) {
      return c.json({ error: 'Seuils de quantité en double' }, 400);
    }
    await prisma.$transaction([
      prisma.coef.deleteMany({}),
      prisma.coef.createMany({
        data: parsed.data.map(([threshold, coef]) => ({ threshold, coef })),
      }),
    ]);
    return c.json(await readSnapshot());
  })

  .put('/zones', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z.array(CatalogZoneSchema).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Zones invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map((z) => z.id))) {
      return c.json({ error: 'Identifiants de zone en double' }, 400);
    }
    await prisma.$transaction([
      prisma.zone.deleteMany({}),
      prisma.zone.createMany({
        data: parsed.data.map((z) => ({
          slug: z.id,
          label: z.label,
          price: z.salePrices[0]?.[1] ?? 0,
          salePrices: z.salePrices,
        })),
      }),
    ]);
    return c.json(await readSnapshot());
  })

  .put('/textile-colors', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z.array(CatalogTextileColorSchema).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Coloris textile invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map((x) => x.id))) {
      return c.json({ error: 'Identifiants de coloris en double' }, 400);
    }
    await prisma.$transaction([
      prisma.textileColor.deleteMany({}),
      prisma.textileColor.createMany({
        data: parsed.data.map((x) => ({ slug: x.id, name: x.name, hex: x.hex, best: x.best })),
      }),
    ]);
    return c.json(await readSnapshot());
  })

  .put('/flock-colors', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z.array(CatalogFlockColorSchema).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Coloris flocage invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map((x) => x.id))) {
      return c.json({ error: 'Identifiants de coloris en double' }, 400);
    }
    await prisma.$transaction([
      prisma.flockColor.deleteMany({}),
      prisma.flockColor.createMany({
        data: parsed.data.map((x) => ({
          slug: x.id,
          name: x.name,
          hex: x.hex,
          special: x.special,
        })),
      }),
    ]);
    return c.json(await readSnapshot());
  })

  .put('/placements', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z.array(CatalogPlacementSchema).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Placements invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map((p) => p.id))) {
      return c.json({ error: 'Identifiants de placement en double' }, 400);
    }
    await prisma.$transaction([
      prisma.placement.deleteMany({}),
      prisma.placement.createMany({
        data: parsed.data.map((p) => ({ slug: p.id, label: p.label, zones: p.zones })),
      }),
    ]);
    return c.json(await readSnapshot());
  })

  .put('/settings', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = CatalogSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Réglages invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.transports.map((t) => t.id))) {
      return c.json({ error: 'Identifiants de transport en double' }, 400);
    }
    await prisma.$transaction([
      prisma.transport.deleteMany({}),
      prisma.transport.createMany({
        data: parsed.data.transports.map((t, i) => ({
          slug: t.id,
          label: t.label,
          surcharge: t.surcharge,
          delay: t.delay,
          sort: i,
        })),
      }),
      prisma.setting.upsert({
        where: { key: 'tgcaRate' },
        create: { key: 'tgcaRate', value: String(parsed.data.tgcaRate) },
        update: { value: String(parsed.data.tgcaRate) },
      }),
    ]);
    return c.json(await readSnapshot());
  });

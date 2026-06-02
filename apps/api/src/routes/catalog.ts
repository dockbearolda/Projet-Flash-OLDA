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
  CatalogFamilySchema,
} from '@df/shared';
import { prisma } from '../db.js';
import { readSnapshot, ensureCatalogSeeded } from '../catalogService.js';

function duplicates(keys: (string | number)[]): boolean {
  return new Set(keys).size !== keys.length;
}

export const catalogRoute = new Hono()
  .get('/', async (c) => {
    let snapshot = await readSnapshot();
    const dbEmpty =
      snapshot.products.length === 0 && snapshot.coefs.length === 0 && snapshot.zones.length === 0;
    // Seed complet sur base neuve ; sinon backfill des familles si la table est vide
    // (cas d'une base existante mise à jour). ensureCatalogSeeded est idempotent.
    if (dbEmpty || snapshot.families.length === 0) {
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
          sizes: p.sizes,
          colorIds: p.colorIds,
          bestColorIds: p.bestColorIds,
          chronopostPrice: p.chronopostPrice ?? null,
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

  .put('/families', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z
      .array(CatalogFamilySchema)
      .min(1, 'Au moins une famille est requise')
      .safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Familles invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map((f) => f.id))) {
      return c.json({ error: 'Identifiants de famille en double' }, 400);
    }
    // Garde-fou : refuser de retirer une famille encore portée par des produits.
    const existing = await prisma.family.findMany({ select: { slug: true, label: true } });
    const keptSlugs = new Set(parsed.data.map((f) => f.id));
    const removed = existing.filter((f) => !keptSlugs.has(f.slug));
    const details: string[] = [];
    for (const fam of removed) {
      const n = await prisma.product.count({ where: { family: fam.slug } });
      if (n > 0) details.push(`« ${fam.label} » (${String(n)} produit${n > 1 ? 's' : ''})`);
    }
    if (details.length > 0) {
      return c.json(
        {
          error: `Familles encore utilisées : ${details.join(', ')} — réaffectez ces produits d'abord.`,
        },
        400,
      );
    }
    await prisma.$transaction([
      prisma.family.deleteMany({}),
      prisma.family.createMany({
        data: parsed.data.map((f, i) => ({ slug: f.id, label: f.label, sort: i })),
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

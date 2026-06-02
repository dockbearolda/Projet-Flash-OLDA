import { defaultCatalogSnapshot } from '@df/shared';
import type { CatalogSnapshot, CatalogProduct, CatalogZone, CatalogTransport } from '@df/shared';
import { prisma } from './db.js';

const TGCA_KEY = 'tgcaRate';

type SalePrices = [number, number][];

function toSalePrices(value: unknown): SalePrices {
  if (!Array.isArray(value)) return [];
  const out: SalePrices = [];
  for (const row of value as unknown[]) {
    if (
      Array.isArray(row) &&
      row.length === 2 &&
      typeof row[0] === 'number' &&
      typeof row[1] === 'number'
    ) {
      out.push([row[0], row[1]]);
    }
  }
  return out;
}

/** Read the full editable catalogue from the database into the shared shape. */
export async function readSnapshot(): Promise<CatalogSnapshot> {
  const def = defaultCatalogSnapshot();
  const [products, zones, coefs, textile, flock, placements, transports, settings] =
    await Promise.all([
      prisma.product.findMany({ orderBy: { ref: 'asc' } }),
      prisma.zone.findMany(),
      prisma.coef.findMany({ orderBy: { threshold: 'asc' } }),
      prisma.textileColor.findMany({ orderBy: { name: 'asc' } }),
      prisma.flockColor.findMany({ orderBy: { name: 'asc' } }),
      prisma.placement.findMany(),
      prisma.transport.findMany({ orderBy: { sort: 'asc' } }),
      prisma.setting.findMany(),
    ]);

  const tgcaSetting = settings.find((s) => s.key === TGCA_KEY);
  const tgcaRate = tgcaSetting ? Number(tgcaSetting.value) : def.tgcaRate;

  return {
    products: products.map(
      (p): CatalogProduct => ({
        ref: p.ref,
        supplierRef: p.supplierRef,
        name: p.name,
        family: p.family as CatalogProduct['family'],
        priceAchat: Number(p.priceAchat),
        chronopostPrice: p.chronopostPrice == null ? null : Number(p.chronopostPrice),
        sizes: p.sizes as CatalogProduct['sizes'],
        colorIds: p.colorIds,
        bestColorIds: p.bestColorIds,
      }),
    ),
    zones: zones.map(
      (z): CatalogZone => ({
        id: z.slug,
        label: z.label,
        salePrices: toSalePrices(z.salePrices),
      }),
    ),
    coefs: coefs.map((c) => [c.threshold, Number(c.coef)] as [number, number]),
    textileColors: textile.map((c) => ({ id: c.slug, name: c.name, hex: c.hex, best: c.best })),
    flockColors: flock.map((c) => ({
      id: c.slug,
      name: c.name,
      hex: c.hex,
      special: c.special,
    })),
    placements: placements.map((p) => ({ id: p.slug, label: p.label, zones: p.zones })),
    transports: transports.map(
      (t): CatalogTransport => ({
        id: t.slug,
        label: t.label,
        surcharge: Number(t.surcharge),
        delay: t.delay,
      }),
    ),
    tgcaRate: Number.isFinite(tgcaRate) ? tgcaRate : def.tgcaRate,
  };
}

/**
 * Idempotently fill any *missing* catalogue data from the defaults.
 *
 * This only seeds collections that are completely empty and backfills the
 * tiered `salePrices` for zones created under the old flat-price schema. It
 * never overwrites existing rows, so the patron's edits are preserved across
 * deploys.
 */
export async function ensureCatalogSeeded(): Promise<void> {
  const def = defaultCatalogSnapshot();
  const [
    productCount,
    coefCount,
    zoneCount,
    textileCount,
    flockCount,
    placementCount,
    transportCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.coef.count(),
    prisma.zone.count(),
    prisma.textileColor.count(),
    prisma.flockColor.count(),
    prisma.placement.count(),
    prisma.transport.count(),
  ]);

  if (productCount === 0 && def.products.length > 0) {
    await prisma.product.createMany({
      data: def.products.map((p) => ({
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
    });
  }

  if (coefCount === 0 && def.coefs.length > 0) {
    await prisma.coef.createMany({
      data: def.coefs.map(([threshold, coef]) => ({ threshold, coef })),
    });
  }

  if (zoneCount === 0 && def.zones.length > 0) {
    await prisma.zone.createMany({
      data: def.zones.map((z) => ({
        slug: z.id,
        label: z.label,
        price: z.salePrices[0]?.[1] ?? 0,
        salePrices: z.salePrices,
      })),
    });
  } else {
    // Backfill the tiered grid for zones stored under the old flat schema.
    const zones = await prisma.zone.findMany();
    for (const z of zones) {
      if (toSalePrices(z.salePrices).length === 0) {
        const fromDefault = def.zones.find((d) => d.id === z.slug);
        const salePrices: SalePrices = fromDefault?.salePrices ?? [[1, Number(z.price)]];
        await prisma.zone.update({ where: { id: z.id }, data: { salePrices } });
      }
    }
  }

  if (textileCount === 0 && def.textileColors.length > 0) {
    await prisma.textileColor.createMany({
      data: def.textileColors.map((c) => ({ slug: c.id, name: c.name, hex: c.hex, best: c.best })),
    });
  }

  if (flockCount === 0 && def.flockColors.length > 0) {
    await prisma.flockColor.createMany({
      data: def.flockColors.map((c) => ({
        slug: c.id,
        name: c.name,
        hex: c.hex,
        special: c.special,
      })),
    });
  }

  if (placementCount === 0 && def.placements.length > 0) {
    await prisma.placement.createMany({
      data: def.placements.map((p) => ({ slug: p.id, label: p.label, zones: p.zones })),
    });
  }

  if (transportCount === 0 && def.transports.length > 0) {
    await prisma.transport.createMany({
      data: def.transports.map((t, i) => ({
        slug: t.id,
        label: t.label,
        surcharge: t.surcharge,
        delay: t.delay,
        sort: i,
      })),
    });
  }

  const tgca = await prisma.setting.findUnique({ where: { key: TGCA_KEY } });
  if (!tgca) {
    await prisma.setting.create({ data: { key: TGCA_KEY, value: String(def.tgcaRate) } });
  }
}

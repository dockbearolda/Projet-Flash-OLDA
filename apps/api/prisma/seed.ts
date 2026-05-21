import { PrismaClient } from '@prisma/client';
import {
  PRODUCTS,
  SIZE_KEYS,
  TEXTILE_COLORS,
  FLOCK_COLORS,
  PLACEMENTS,
  ZONES,
  ZONE_IDS,
  COEFS,
  TRANSPORT_OPTIONS,
  TGCA_RATE,
} from '@df/shared';

const prisma = new PrismaClient();

async function main() {
  // Défauts par référence (vide ⇒ « tout » au runtime, mais on sème explicitement
  // toutes les tailles / tous les coloris + les best-sellers globaux).
  const defaultSizes = [...SIZE_KEYS];
  const defaultColorIds = TEXTILE_COLORS.map((c) => c.id);
  const defaultBestColorIds = TEXTILE_COLORS.filter((c) => c.best).map((c) => c.id);

  // Products — on ne touche pas à la config par réf (sizes/colorIds/bestColorIds)
  // lors d'un update afin de préserver les réglages du patron.
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { ref: p.ref },
      create: {
        ref: p.ref,
        supplierRef: p.supplierRef,
        name: p.name,
        family: p.family,
        priceAchat: p.priceAchat,
        sizes: defaultSizes,
        colorIds: defaultColorIds,
        bestColorIds: defaultBestColorIds,
      },
      update: {
        supplierRef: p.supplierRef,
        name: p.name,
        family: p.family,
        priceAchat: p.priceAchat,
      },
    });
  }
  console.warn(`[seed] products: ${PRODUCTS.length.toString()}`);

  // Textile colors
  for (const c of TEXTILE_COLORS) {
    await prisma.textileColor.upsert({
      where: { slug: c.id },
      create: { slug: c.id, name: c.name, hex: c.hex, best: c.best },
      update: { name: c.name, hex: c.hex, best: c.best },
    });
  }
  console.warn(`[seed] textile colors: ${TEXTILE_COLORS.length.toString()}`);

  // Flock colors
  for (const c of FLOCK_COLORS) {
    await prisma.flockColor.upsert({
      where: { slug: c.id },
      create: { slug: c.id, name: c.name, hex: c.hex ?? null, special: c.special ?? false },
      update: { name: c.name, hex: c.hex ?? null, special: c.special ?? false },
    });
  }
  console.warn(`[seed] flock colors: ${FLOCK_COLORS.length.toString()}`);

  // Placements
  for (const p of PLACEMENTS) {
    await prisma.placement.upsert({
      where: { slug: p.id },
      create: { slug: p.id, label: p.label, zones: [...p.zones] },
      update: { label: p.label, zones: [...p.zones] },
    });
  }
  console.warn(`[seed] placements: ${PLACEMENTS.length.toString()}`);

  // Zones — `price` keeps the qty=1 value for back-compat; `salePrices` holds
  // the full per-qty tiered grid used by runtime pricing.
  for (const id of ZONE_IDS) {
    const z = ZONES[id];
    const salePrices = z.salePrices.map(([t, v]) => [t, v]);
    const price = z.salePrices[0]?.[1] ?? 0;
    await prisma.zone.upsert({
      where: { slug: z.id },
      create: { slug: z.id, label: z.label, price, salePrices },
      update: { label: z.label, price, salePrices },
    });
  }
  console.warn(`[seed] zones: ${ZONE_IDS.length.toString()}`);

  // Coefs
  for (const [threshold, c] of COEFS) {
    await prisma.coef.upsert({
      where: { threshold },
      create: { threshold, coef: c },
      update: { coef: c },
    });
  }
  console.warn(`[seed] coefs: ${COEFS.length.toString()}`);

  // Transports
  for (const [i, t] of TRANSPORT_OPTIONS.entries()) {
    await prisma.transport.upsert({
      where: { slug: t.id },
      create: { slug: t.id, label: t.label, surcharge: t.surcharge, delay: t.delay, sort: i },
      update: { label: t.label, surcharge: t.surcharge, delay: t.delay, sort: i },
    });
  }
  console.warn(`[seed] transports: ${TRANSPORT_OPTIONS.length.toString()}`);

  // Settings (TGCA rate)
  await prisma.setting.upsert({
    where: { key: 'tgcaRate' },
    create: { key: 'tgcaRate', value: String(TGCA_RATE) },
    update: { value: String(TGCA_RATE) },
  });
  console.warn('[seed] settings: tgcaRate');
}

main()
  .catch((e: unknown) => {
    console.error('[seed] failed', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import {
  PRODUCTS,
  TEXTILE_COLORS,
  FLOCK_COLORS,
  PLACEMENTS,
  ZONES,
  ZONE_IDS,
  COEFS,
} from '@df/shared';

const prisma = new PrismaClient();

async function main() {
  // Products
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { ref: p.ref },
      create: {
        ref: p.ref,
        supplierRef: p.supplierRef,
        name: p.name,
        family: p.family,
        priceAchat: p.priceAchat,
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

  // Zones — DB only stores the qty=1 sale price (legacy field) for display
  // back-compat; runtime pricing uses the full per-qty grid from the catalog.
  for (const id of ZONE_IDS) {
    const z = ZONES[id];
    const price = z.salePrices[0]?.[1] ?? 0;
    await prisma.zone.upsert({
      where: { slug: z.id },
      create: { slug: z.id, label: z.label, price },
      update: { label: z.label, price },
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
}

main()
  .catch((e: unknown) => {
    console.error('[seed] failed', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

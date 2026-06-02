import { z } from 'zod';
import { SIZE_KEYS } from '../catalog/products.js';

export const ProductFamilySchema = z.enum(['unisexe', 'femme', 'enfant']);

export const SizeKeySchema = z.enum(SIZE_KEYS);

export const CatalogProductSchema = z.object({
  ref: z.string().trim().min(1, 'Référence requise').max(40),
  supplierRef: z.string().trim().max(60),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  family: ProductFamilySchema,
  priceAchat: z.number().min(0),
  // Configuration par référence. Tableaux vides ⇒ « tout » (rétro-compatible :
  // les snapshots et lignes antérieurs n'avaient pas ces champs).
  sizes: z.array(SizeKeySchema).default([]),
  colorIds: z.array(z.string().trim().min(1)).default([]),
  bestColorIds: z.array(z.string().trim().min(1)).default([]),
  // Prix Chronopost €/pièce propre à la référence. null/absent ⇒ tarif global.
  // 0 ⇒ Chronopost offert pour cette référence. Ne s'applique qu'au mode chronopost.
  chronopostPrice: z.number().min(0).nullable().default(null),
});

export const CatalogCoefSchema = z.tuple([z.number().int().min(0), z.number().min(0)]);

const SalePriceRowSchema = z.tuple([z.number().int().min(0), z.number().min(0)]);

export const CatalogZoneSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  salePrices: z.array(SalePriceRowSchema),
});

/** Accepts `#rgb`, `#rrggbb`, `#rrggbbaa` (with or without the leading #). */
const HexSchema = z
  .string()
  .trim()
  .regex(/^#?[0-9a-fA-F]{3,8}$/, 'Couleur hexadécimale invalide');

export const CatalogTextileColorSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  hex: HexSchema,
  best: z.boolean(),
});

export const CatalogFlockColorSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  hex: HexSchema.nullable(),
  special: z.boolean(),
});

export const CatalogPlacementSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  zones: z.array(z.string().trim().min(1)),
});

export const CatalogTransportSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  surcharge: z.number().min(0),
  delay: z.string().trim().max(60),
});

export const CatalogSettingsSchema = z.object({
  tgcaRate: z.number().min(0).max(1),
  transports: z.array(CatalogTransportSchema),
});
export type CatalogSettings = z.infer<typeof CatalogSettingsSchema>;

export const CatalogSnapshotSchema = z.object({
  products: z.array(CatalogProductSchema),
  zones: z.array(CatalogZoneSchema),
  coefs: z.array(CatalogCoefSchema),
  textileColors: z.array(CatalogTextileColorSchema),
  flockColors: z.array(CatalogFlockColorSchema),
  placements: z.array(CatalogPlacementSchema),
  transports: z.array(CatalogTransportSchema),
  tgcaRate: z.number().min(0).max(1),
});

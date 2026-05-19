import { z } from 'zod';
import { SIZE_KEYS } from '../catalog/products.js';

export const CustomerSchema = z.object({
  name: z.string().trim().min(1, 'Le nom du client est requis').max(120),
  email: z.string().trim().email().or(z.literal('')).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const SizesSchema = z.object(
  Object.fromEntries(SIZE_KEYS.map((k) => [k, z.number().int().min(0).default(0)])) as Record<
    (typeof SIZE_KEYS)[number],
    z.ZodDefault<z.ZodNumber>
  >,
);

export type Sizes = z.infer<typeof SizesSchema>;

export const FlockModeSchema = z.enum(['multi', 'single']);
export type FlockMode = z.infer<typeof FlockModeSchema>;

export const TransportSchema = z.enum(['maritime', 'chronopost', 'stock']);
export type Transport = z.infer<typeof TransportSchema>;

export const QuoteLineSchema = z.object({
  id: z.string().min(1),
  productRef: z.string().min(1),
  placementId: z.string().min(1),
  textileColorId: z.string().min(1),
  flockMode: FlockModeSchema,
  flockColorId: z.string().nullable(),
  sizes: SizesSchema,
  linked: z.boolean().default(true),
  // CODE multi-couleurs : % ajouté au PU HT (défaut 10 = +10 %), arrondi sup. 0,10 €.
  code: z.number().min(0).max(100).default(10),
  // Per-line overrides. If undefined, fall back to the quote-level value.
  transport: TransportSchema.optional(),
  revente: z.boolean().optional(),
});

export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const QuoteStatusSchema = z.enum(['draft', 'sent', 'archived']);
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

export const QuoteSchema = z.object({
  id: z.string().min(1),
  status: QuoteStatusSchema,
  customer: CustomerSchema,
  transport: TransportSchema,
  revente: z.boolean(),
  lines: z.array(QuoteLineSchema).min(1),
  activeLineId: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Quote = z.infer<typeof QuoteSchema>;

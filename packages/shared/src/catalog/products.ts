export type ProductFamily = 'unisexe' | 'femme' | 'enfant';

export interface Product {
  ref: string;
  supplierRef: string;
  name: string;
  family: ProductFamily;
  priceAchat: number;
}

export const PRODUCTS: readonly Product[] = [
  // UNISEXE
  {
    ref: 'H-004',
    supplierRef: 'NS308',
    name: 'T-shirt Oversize Sweat',
    family: 'unisexe',
    priceAchat: 10.95,
  },
  {
    ref: 'H-003',
    supplierRef: 'NS332',
    name: 'T-shirt Oversize',
    family: 'unisexe',
    priceAchat: 7.01,
  },
  {
    ref: 'H-005',
    supplierRef: 'NS345',
    name: 'T-shirt Tye Dye',
    family: 'unisexe',
    priceAchat: 7.01,
  },
  {
    ref: 'H-013',
    supplierRef: 'K357',
    name: 'T-shirt Classique Col V',
    family: 'unisexe',
    priceAchat: 4.42,
  },
  {
    ref: 'H-002',
    supplierRef: 'NS305',
    name: 'T-shirt Classique',
    family: 'unisexe',
    priceAchat: 4.87,
  },
  {
    ref: 'H-021',
    supplierRef: 'NS352',
    name: 'T-shirt Oversize Léger',
    family: 'unisexe',
    priceAchat: 5.5,
  },
  {
    ref: 'H-022',
    supplierRef: 'K3008',
    name: 'T-shirt Oversize',
    family: 'unisexe',
    priceAchat: 5.5,
  },
  {
    ref: 'H-001',
    supplierRef: 'NS300',
    name: 'T-shirt léger Premium',
    family: 'unisexe',
    priceAchat: 4.05,
  },
  {
    ref: 'H-012',
    supplierRef: 'CGTM044',
    name: 'T-shirt Léger Col V',
    family: 'unisexe',
    priceAchat: 3.45,
  },
  {
    ref: 'H-014',
    supplierRef: 'K3025',
    name: 'T-shirt Léger Pro',
    family: 'unisexe',
    priceAchat: 2.81,
  },
  {
    ref: 'H-016',
    supplierRef: 'PA438',
    name: 'T-shirt Sport',
    family: 'unisexe',
    priceAchat: 2.66,
  },
  {
    ref: 'H-011',
    supplierRef: 'K3022',
    name: 'T-shirt Sans Manches Léger',
    family: 'unisexe',
    priceAchat: 2.46,
  },
  {
    ref: 'H-019',
    supplierRef: 'CGTU01T',
    name: 'T-shirt Léger Éco',
    family: 'unisexe',
    priceAchat: 2.09,
  },
  {
    ref: 'L-001',
    supplierRef: 'PARAGON 210',
    name: 'Lycra anti-UV 50+',
    family: 'unisexe',
    priceAchat: 7.9,
  },
  // FEMME
  {
    ref: 'F-001',
    supplierRef: 'NS342',
    name: 'Débardeur Crop Top',
    family: 'femme',
    priceAchat: 5.55,
  },
  {
    ref: 'F-004',
    supplierRef: 'NS313',
    name: 'T-shirt Oversize',
    family: 'femme',
    priceAchat: 5.22,
  },
  {
    ref: 'F-012',
    supplierRef: 'NS309',
    name: 'T-shirt à revers',
    family: 'femme',
    priceAchat: 5.15,
  },
  {
    ref: 'F-006',
    supplierRef: 'NS334',
    name: 'T-shirt Léger Col V',
    family: 'femme',
    priceAchat: 4.81,
  },
  {
    ref: 'F-003',
    supplierRef: 'NS324',
    name: 'T-shirt Léger Col Rond',
    family: 'femme',
    priceAchat: 4.05,
  },
  {
    ref: 'F-005',
    supplierRef: 'CGTW045',
    name: 'T-shirt Léger Col V',
    family: 'femme',
    priceAchat: 3.45,
  },
  {
    ref: 'F-008',
    supplierRef: 'K3026IC',
    name: 'T-shirt Léger Pro',
    family: 'femme',
    priceAchat: 2.81,
  },
  // ENFANT
  {
    ref: 'E-001',
    supplierRef: 'NS307',
    name: 'T-shirt Léger Classique',
    family: 'enfant',
    priceAchat: 3.37,
  },
  {
    ref: 'E-003',
    supplierRef: 'K3027',
    name: 'T-shirt Léger',
    family: 'enfant',
    priceAchat: 2.02,
  },
] as const;

export type ProductRef = (typeof PRODUCTS)[number]['ref'];

export const PRODUCT_BY_REF: Readonly<Record<string, Product>> = Object.fromEntries(
  PRODUCTS.map((p) => [p.ref, p]),
);

export const TRANSPORT_OPTIONS = [
  { id: 'maritime' as const, label: 'Maritime', surcharge: 0 },
  { id: 'chronopost' as const, label: 'Chronopost', surcharge: 1.5 },
  { id: 'stock' as const, label: 'Stock', surcharge: 0 },
] as const;

export type TransportId = (typeof TRANSPORT_OPTIONS)[number]['id'];

export const TGCA_RATE = 0.04;

export const SIZE_KEYS = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'autres'] as const;
export type SizeKey = (typeof SIZE_KEYS)[number];

export const SIZE_LABELS: Readonly<Record<SizeKey, string>> = {
  xs: 'XS',
  s: 'S',
  m: 'M',
  l: 'L',
  xl: 'XL',
  xxl: '2XL',
  autres: 'Autres',
};

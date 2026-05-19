/**
 * Coefficients de marge dégressifs (§6.1).
 * Tuple : [seuil quantité minimum, coef].
 * Le coef appliqué est celui du plus grand seuil ≤ quantité totale.
 */
export const COEFS = [
  [1, 3.8],
  [5, 2.09],
  [10, 1.91],
  [20, 1.82],
  [30, 1.73],
  [40, 1.64],
  [50, 1.55],
  [60, 1.5],
  [70, 1.46],
  [80, 1.37],
  [90, 1.32],
  [100, 1.27],
  [150, 1.27],
] as const satisfies readonly (readonly [number, number])[];

export type CoefRow = readonly [number, number];

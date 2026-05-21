import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const fmtEUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

/** Standalone EUR formatter — safe to pass by reference (e.g. as a prop). */
export const eur = (n: number): string => fmtEUR.format(n);

export const fmtInt = new Intl.NumberFormat('fr-FR');

export const fmtCoef = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export function fmtShortDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return format(date, 'd MMM yyyy', { locale: fr });
}

/** Date compacte et triable pour les noms de fichiers : « 2026-05-21 ». */
export function fmtFileDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return format(date, 'yyyy-MM-dd');
}

/**
 * Met une majuscule à la première lettre de chaque mot (séparé par un espace
 * ou un tiret), en préservant le reste de la saisie — ainsi « jean dupont »
 * devient « Jean Dupont » sans forcer en minuscule un sigle déjà tapé en
 * capitales (« SARL », « OLDA »).
 */
export function capitalizeWords(value: string): string {
  return value.replace(
    /(^|[\s-])(\p{L})/gu,
    (_m: string, sep: string, first: string) => sep + first.toLocaleUpperCase('fr'),
  );
}

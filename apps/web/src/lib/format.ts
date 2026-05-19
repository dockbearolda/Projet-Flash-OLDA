import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const fmtEUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

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

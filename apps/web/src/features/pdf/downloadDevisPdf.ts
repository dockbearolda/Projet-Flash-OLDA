import { buildDevisDocDefinition } from './devisDoc';
import { devisPdfFilename, type DevisData } from './devisData';

/**
 * Charge pdfmake + ses polices (vfs) en lazy : ils ne pèsent pas sur le bundle
 * initial et ne sont chargés qu'à la première génération de PDF.
 */
async function loadPdfMake() {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.vfs = vfs;
  return pdfMake;
}

/**
 * Construit le devis en PDF (Blob) **100 % côté navigateur** — aucun appel
 * réseau, fonctionne hors-ligne. Réutilisable (téléchargement, pièce jointe…).
 */
export async function buildDevisPdfBlob(data: DevisData): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  const doc = buildDevisDocDefinition(data);
  return new Promise<Blob>((resolve) => {
    pdfMake.createPdf(doc).getBlob(resolve);
  });
}

/**
 * Génère le devis en PDF côté navigateur puis déclenche son téléchargement sous
 * « société client - date.pdf ». Produit hors-ligne, même API/serveur indisponibles.
 */
export async function downloadDevisPdf(data: DevisData): Promise<void> {
  const pdfMake = await loadPdfMake();
  const doc = buildDevisDocDefinition(data);
  pdfMake.createPdf(doc).download(devisPdfFilename(data.customer, data.createdAt));
}

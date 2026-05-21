import { Hono } from 'hono';
import { z } from 'zod';
import { renderHtmlToPdf } from '../pdf.js';

const PdfSchema = z.object({
  // HTML autonome du devis (construit côté client). Plafonné pour éviter l'abus.
  html: z.string().min(1).max(2_000_000),
  fileName: z.string().min(1).max(200).optional(),
});

/** Nettoie un nom de fichier (caractères interdits, extension .pdf). */
function sanitizeFileName(name: string): string {
  const base = name
    .replace(/[\\/:*?"<>|\r\n]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
  if (!base) return 'devis.pdf';
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

export const pdfRoute = new Hono().post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown;
  const parsed = PdfSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
  }

  const fileName = sanitizeFileName(parsed.data.fileName ?? 'devis.pdf');
  try {
    const pdf = await renderHtmlToPdf(parsed.data.html);
    // filename* (UTF-8) pour les accents, avec un repli ASCII pour les vieux clients.
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_');
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[pdf] render failed', err);
    return c.json({ error: 'PDF generation failed' }, 500);
  }
});

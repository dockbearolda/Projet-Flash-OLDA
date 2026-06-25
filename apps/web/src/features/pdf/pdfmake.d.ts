// Les sous-modules de build de pdfmake n'ont pas de types fournis : on les
// déclare au minimum pour l'usage côté navigateur (vfs + createPdf().download()).
declare module 'pdfmake/build/pdfmake' {
  import type { TDocumentDefinitions } from 'pdfmake/interfaces';

  interface TCreatedPdf {
    download(defaultFileName?: string): void;
    open(): void;
    getBlob(cb: (blob: Blob) => void): void;
  }

  interface PdfMakeStatic {
    vfs: Record<string, string>;
    fonts?: Record<string, unknown>;
    createPdf(documentDefinition: TDocumentDefinitions): TCreatedPdf;
  }

  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>;
  export default vfs;
}

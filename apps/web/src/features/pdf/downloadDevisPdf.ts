/**
 * Génère le devis en PDF puis déclenche son téléchargement sous le nom donné
 * (l'utilisateur choisit l'emplacement selon les réglages du navigateur).
 *
 * Le PDF est rendu côté serveur (Chrome sans écran) à partir du HTML du devis :
 * vrai PDF vectoriel, texte net et sélectionnable, fidèle au design écran et
 * paginé proprement. Nécessite une connexion internet.
 */
export async function downloadDevisPdf(html: string, fileName: string): Promise<void> {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, fileName }),
  });
  if (!res.ok) {
    throw new Error(`Génération PDF: HTTP ${String(res.status)}`);
  }
  triggerDownload(await res.blob(), fileName);
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Révoque après un court délai pour laisser le téléchargement démarrer.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

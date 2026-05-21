/**
 * Imprime un document HTML autonome (le devis) via un iframe caché, sans
 * quitter l'application ni dépendre d'un service externe. Le rendu est
 * vectoriel (texte sélectionnable) : l'utilisateur choisit « Enregistrer
 * au format PDF » dans la fenêtre d'impression du navigateur.
 *
 * 100 % client : aucune dépendance, aucun secret, fonctionne hors-ligne (PWA).
 */
export function printDevisHtml(html: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');
    // Hors écran plutôt que display:none — certains navigateurs n'impriment
    // pas le contenu d'un iframe non rendu.
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
    iframe.srcdoc = html;

    let settled = false;
    const cleanup = (): void => {
      if (settled) return;
      settled = true;
      // Laisser le temps à la fenêtre d'impression de lire le document.
      window.setTimeout(() => {
        iframe.remove();
      }, 500);
      resolve();
    };

    iframe.onload = (): void => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      // afterprint : déclenché que l'utilisateur enregistre ou annule.
      win.addEventListener('afterprint', cleanup, { once: true });
      // Filet de sécurité si afterprint ne se déclenche pas (certains navigateurs).
      window.setTimeout(cleanup, 60_000);
      // Laisser la mise en page se stabiliser avant d'imprimer.
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          cleanup();
        }
      }, 120);
    };

    document.body.appendChild(iframe);
  });
}

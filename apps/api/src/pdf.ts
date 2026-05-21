import puppeteer, { type Browser } from 'puppeteer-core';

/** Chemin de l'exécutable Chrome/Chromium. */
function executablePath(): string {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv) return fromEnv;
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  return '/usr/bin/chromium';
}

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
];

const RENDER_TIMEOUT_MS = 20_000;

// Un seul navigateur réutilisé entre les requêtes (le lancer coûte ~1 s).
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise.catch(() => null);
    if (existing?.connected) return existing;
    browserPromise = null;
  }
  browserPromise = puppeteer.launch({
    executablePath: executablePath(),
    headless: true,
    args: LAUNCH_ARGS,
  });
  const browser = await browserPromise;
  browser.on('disconnected', () => {
    browserPromise = null;
  });
  return browser;
}

/**
 * Rend un document HTML autonome en PDF A4 vectoriel via Chrome sans écran :
 * l'équivalent automatisé de « Enregistrer au format PDF » de l'impression
 * Chrome — texte net et sélectionnable, fidèle au design, pagination CSS native.
 *
 * Sécurité : on rend du HTML fourni par le client (route authentifiée), donc le
 * réseau est coupé (aucune ressource externe → pas de SSRF/accès fichier) et le
 * JavaScript est désactivé (le gabarit est du HTML/CSS statique).
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      const isMainDoc = req.isNavigationRequest() && req.frame() === page.mainFrame();
      if (url.startsWith('data:') || url.startsWith('about:') || isMainDoc) {
        void req.continue();
      } else {
        void req.abort();
      }
    });
    await page.setContent(html, { waitUntil: 'load', timeout: RENDER_TIMEOUT_MS });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: RENDER_TIMEOUT_MS,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

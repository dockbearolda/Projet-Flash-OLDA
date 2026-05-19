import { COEFS, ZONES, ZONE_IDS } from '@df/shared';
import { fmtEUR, fmtCoef } from '@/lib/format';

export default function CoefsPage() {
  return (
    <div>
      <h1 className="df-display text-3xl mb-1">Coefficients</h1>
      <p className="text-sm text-[var(--df-ink-3)] mb-6">
        Paliers de marge et PV par zone DTF (modifiables en Étape 10 via DB)
      </p>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="df-caps mb-3">Paliers de marge</h2>
          <div className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] overflow-hidden">
            <div className="grid grid-cols-2 px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)]">
              <div className="df-caps">Seuil (pièces)</div>
              <div className="df-caps text-right">Coefficient</div>
            </div>
            {COEFS.map(([threshold, c]) => (
              <div
                key={threshold}
                className="grid grid-cols-2 px-4 py-2 border-b border-[var(--df-border)] last:border-b-0"
              >
                <span className="df-mono text-xs tabular-nums">≥ {threshold}</span>
                <span className="df-mono text-sm text-right text-[var(--df-ink)] tabular-nums">
                  ×{fmtCoef.format(c)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="df-caps mb-3">PV par zone DTF (selon palier de quantité)</h2>
          <div className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] overflow-hidden">
            <div
              className="grid px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)]"
              style={{ gridTemplateColumns: `80px repeat(${String(ZONE_IDS.length)}, 1fr)` }}
            >
              <div className="df-caps">Qté</div>
              {ZONE_IDS.map((id) => (
                <div key={id} className="df-caps text-right">
                  {ZONES[id].label}
                </div>
              ))}
            </div>
            {COEFS.map(([threshold]) => (
              <div
                key={threshold}
                className="grid px-4 py-2 border-b border-[var(--df-border)] last:border-b-0"
                style={{ gridTemplateColumns: `80px repeat(${String(ZONE_IDS.length)}, 1fr)` }}
              >
                <span className="df-mono text-xs tabular-nums">≥ {threshold}</span>
                {ZONE_IDS.map((id) => {
                  const row = ZONES[id].salePrices.find(([t]) => t === threshold);
                  return (
                    <span
                      key={id}
                      className="df-mono text-sm text-right text-[var(--df-ink)] tabular-nums"
                    >
                      {row ? fmtEUR.format(row[1]) : '—'}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-[var(--df-radius)] bg-[var(--df-accent-soft)] text-[var(--df-accent)] text-xs">
            <strong>Formule §6.4 :</strong> PU HT = vierge + Σ PV_zone[qté]
            <br />
            vierge = ceil(prix_achat × coef × 10) / 10 (arrondi sup. 0,10 €).
            <br />
            Le palier de quantité s&apos;applique à toute la ligne, basé sur Σ qté du devis.
          </div>
        </section>
      </div>
    </div>
  );
}

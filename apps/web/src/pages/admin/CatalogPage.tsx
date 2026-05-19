import { PRODUCTS } from '@df/shared';
import { fmtEUR } from '@/lib/format';

export default function CatalogPage() {
  return (
    <div>
      <h1 className="df-display text-3xl mb-1">Catalogue</h1>
      <p className="text-sm text-[var(--df-ink-3)] mb-6">
        {PRODUCTS.length} produits · prix achat 2026 verrouillés (modifiables en Étape 10 via DB)
      </p>

      <div className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] overflow-hidden">
        <div className="grid grid-cols-[100px_140px_1fr_120px_140px] px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)]">
          <div className="df-caps">Réf</div>
          <div className="df-caps">NS / Fournisseur</div>
          <div className="df-caps">Nom</div>
          <div className="df-caps">Famille</div>
          <div className="df-caps text-right">Prix achat</div>
        </div>
        {PRODUCTS.map((p) => (
          <div
            key={p.ref}
            className="grid grid-cols-[100px_140px_1fr_120px_140px] px-4 py-2 border-b border-[var(--df-border)] last:border-b-0 hover:bg-[var(--df-bg-2)]"
          >
            <span className="df-mono text-xs text-[var(--df-ink)]">{p.ref}</span>
            <span className="df-mono text-xs text-[var(--df-ink-3)]">{p.supplierRef}</span>
            <span className="text-sm text-[var(--df-ink)]">{p.name}</span>
            <span className="text-xs text-[var(--df-ink-2)] capitalize">{p.family}</span>
            <span className="df-mono text-sm text-right text-[var(--df-ink)] tabular-nums">
              {fmtEUR.format(p.priceAchat)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

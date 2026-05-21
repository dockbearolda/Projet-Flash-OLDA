import { useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { SIZE_KEYS, SIZE_LABELS } from '@df/shared';
import type { CatalogProduct, CatalogTextileColor, ProductFamily, SizeKey } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveProducts } from '@/features/catalog/api';
import { cn } from '@/lib/cn';
import {
  PageHeader,
  TextField,
  NumberField,
  DeleteRowButton,
  AddRowButton,
  SaveBar,
  Card,
} from './components/adminUi';
import { useSection } from './components/useSection';

const FAMILIES: { value: ProductFamily; label: string }[] = [
  { value: 'unisexe', label: 'Homme / Unisexe' },
  { value: 'femme', label: 'Femme' },
  { value: 'enfant', label: 'Enfant' },
];

const COLS = 'grid-cols-[36px_110px_150px_1fr_160px_120px_44px]';

export default function CatalogPage() {
  const cat = useCatalog();
  return <ProductsEditor key={cat.version} initial={cat.products} colors={cat.textileColors} />;
}

function ProductsEditor({
  initial,
  colors,
}: {
  initial: CatalogProduct[];
  colors: CatalogTextileColor[];
}) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, saveProducts);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function update(i: number, patch: Partial<CatalogProduct>) {
    setDraft((d) => d.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
    setOpenIndex(null);
  }
  function add() {
    setDraft((d) => [
      ...d,
      {
        ref: '',
        supplierRef: '',
        name: '',
        family: 'unisexe',
        priceAchat: 0,
        sizes: [...SIZE_KEYS],
        colorIds: colors.map((c) => c.id),
        bestColorIds: colors.filter((c) => c.best).map((c) => c.id),
      },
    ]);
  }

  // Tableaux vides ⇒ « tout » : on l'affiche donc comme tout coché.
  const sizeOn = (p: CatalogProduct, k: SizeKey) =>
    p.sizes.length > 0 ? p.sizes.includes(k) : true;
  const colorOn = (p: CatalogProduct, id: string) =>
    p.colorIds.length > 0 ? p.colorIds.includes(id) : true;
  const colorBest = (p: CatalogProduct, id: string) => p.bestColorIds.includes(id);

  function toggleSize(i: number, k: SizeKey) {
    setDraft((d) =>
      d.map((p, idx) => {
        if (idx !== i) return p;
        const cur = new Set<SizeKey>(p.sizes.length > 0 ? p.sizes : SIZE_KEYS);
        if (cur.has(k)) {
          if (cur.size <= 1) return p; // garder au moins une taille
          cur.delete(k);
        } else {
          cur.add(k);
        }
        return { ...p, sizes: SIZE_KEYS.filter((s) => cur.has(s)) };
      }),
    );
  }

  function toggleColorAvail(i: number, id: string) {
    const allIds = colors.map((c) => c.id);
    setDraft((d) =>
      d.map((p, idx) => {
        if (idx !== i) return p;
        const cur = new Set(p.colorIds.length > 0 ? p.colorIds : allIds);
        let best = p.bestColorIds;
        if (cur.has(id)) {
          if (cur.size <= 1) return p; // garder au moins un coloris
          cur.delete(id);
          best = best.filter((b) => b !== id); // un coloris retiré ne peut rester best-seller
        } else {
          cur.add(id);
        }
        return { ...p, colorIds: allIds.filter((cid) => cur.has(cid)), bestColorIds: best };
      }),
    );
  }

  function toggleColorBest(i: number, id: string) {
    const allIds = colors.map((c) => c.id);
    setDraft((d) =>
      d.map((p, idx) => {
        if (idx !== i) return p;
        const best = p.bestColorIds;
        if (best.includes(id)) {
          return { ...p, bestColorIds: best.filter((b) => b !== id) };
        }
        // Marquer best-seller ⇒ s'assurer que le coloris est disponible.
        const cur = new Set(p.colorIds.length > 0 ? p.colorIds : allIds);
        cur.add(id);
        return {
          ...p,
          colorIds: allIds.filter((cid) => cur.has(cid)),
          bestColorIds: [...best, id],
        };
      }),
    );
  }

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${String(draft.length)} produits · référence, nom, famille et prix d’achat. Dépliez une ligne pour choisir les tailles et coloris (best-sellers) proposés.`}
      />

      <Card>
        <div
          className={`grid ${COLS} px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)] gap-2`}
        >
          <div />
          <div className="df-caps">Réf</div>
          <div className="df-caps">Réf fournisseur</div>
          <div className="df-caps">Nom</div>
          <div className="df-caps">Famille</div>
          <div className="df-caps text-right">Prix achat</div>
          <div />
        </div>
        {draft.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--df-ink-3)]">
            Aucun produit. Ajoutez-en un ci-dessous.
          </div>
        ) : (
          draft.map((p, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="border-b border-[var(--df-border)] last:border-b-0">
                <div className={`grid ${COLS} px-4 py-2 items-center gap-2`}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenIndex(isOpen ? null : i);
                    }}
                    aria-expanded={isOpen}
                    aria-label={`Configurer tailles et coloris de ${p.ref || `la ligne ${String(i + 1)}`}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--df-radius)] text-[var(--df-ink-3)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)]"
                  >
                    <ChevronRight
                      size={16}
                      strokeWidth={2}
                      className={cn('transition-transform', isOpen && 'rotate-90')}
                      aria-hidden
                    />
                  </button>
                  <TextField
                    value={p.ref}
                    onChange={(v) => {
                      update(i, { ref: v });
                    }}
                    placeholder="H-001"
                    ariaLabel={`Référence produit ${String(i + 1)}`}
                    className="df-mono"
                  />
                  <TextField
                    value={p.supplierRef}
                    onChange={(v) => {
                      update(i, { supplierRef: v });
                    }}
                    placeholder="NS300"
                    ariaLabel={`Référence fournisseur ${String(i + 1)}`}
                    className="df-mono"
                  />
                  <TextField
                    value={p.name}
                    onChange={(v) => {
                      update(i, { name: v });
                    }}
                    placeholder="Nom du produit"
                    ariaLabel={`Nom produit ${String(i + 1)}`}
                  />
                  <select
                    value={p.family}
                    onChange={(e) => {
                      update(i, { family: e.target.value as ProductFamily });
                    }}
                    aria-label={`Famille produit ${String(i + 1)}`}
                    className="df-input h-9 text-sm cursor-pointer"
                  >
                    {FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <NumberField
                    value={p.priceAchat}
                    onChange={(v) => {
                      update(i, { priceAchat: v });
                    }}
                    suffix="€"
                    ariaLabel={`Prix achat produit ${String(i + 1)}`}
                  />
                  <DeleteRowButton
                    onClick={() => {
                      remove(i);
                    }}
                    label={`Supprimer le produit ${String(i + 1)}`}
                  />
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 bg-[var(--df-surface-2)] flex flex-col gap-4">
                    <section>
                      <span className="df-caps">Tailles proposées</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {SIZE_KEYS.map((k) => {
                          const on = sizeOn(p, k);
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => {
                                toggleSize(i, k);
                              }}
                              aria-pressed={on}
                              className={cn(
                                'h-9 min-w-[3rem] px-3 rounded-[var(--df-radius-sm)] border text-sm font-medium transition-colors',
                                on
                                  ? 'border-[var(--df-accent)] bg-[var(--df-accent-soft)] text-[var(--df-accent)]'
                                  : 'border-dashed border-[var(--df-border-strong)] text-[var(--df-ink-3)] hover:text-[var(--df-ink)]',
                              )}
                            >
                              {SIZE_LABELS[k]}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <span className="df-caps">
                        Coloris textile — cliquez pour (dé)activer · étoile = best-seller
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {colors.map((c) => {
                          const on = colorOn(p, c.id);
                          const best = colorBest(p, c.id);
                          return (
                            <div
                              key={c.id}
                              className={cn(
                                'inline-flex items-center rounded-[var(--df-radius-sm)] border transition-colors',
                                on
                                  ? 'border-[var(--df-border-strong)] bg-[var(--df-surface)]'
                                  : 'border-dashed border-[var(--df-border)] opacity-50',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  toggleColorAvail(i, c.id);
                                }}
                                aria-pressed={on}
                                aria-label={`${c.name} ${on ? 'disponible' : 'indisponible'}`}
                                className="flex items-center gap-1.5 pl-2 pr-1.5 h-9"
                              >
                                <span
                                  className="w-4 h-4 rounded-full shrink-0 border border-[rgba(0,0,0,0.12)]"
                                  style={{ background: c.hex }}
                                  aria-hidden
                                />
                                <span className="text-xs text-[var(--df-ink)]">{c.name}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  toggleColorBest(i, c.id);
                                }}
                                aria-pressed={best}
                                aria-label={`${c.name} best-seller`}
                                title="Best-seller"
                                className={cn(
                                  'inline-flex items-center justify-center w-8 h-9 rounded-r-[var(--df-radius-sm)]',
                                  best
                                    ? 'text-[var(--df-accent)]'
                                    : 'text-[var(--df-ink-4)] hover:text-[var(--df-ink-2)]',
                                )}
                              >
                                <Star
                                  size={15}
                                  strokeWidth={1.8}
                                  fill={best ? 'currentColor' : 'none'}
                                  aria-hidden
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div className="px-4 py-3 border-t border-[var(--df-border)]">
          <AddRowButton onClick={add} label="Ajouter un produit" />
        </div>
      </Card>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import type { CatalogPlacement, CatalogFamily } from '@df/shared';
import { normalizeZonesToSharedSeuils, degressivePricesFromUnit } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { savePlacements } from '@/features/catalog/api';
import {
  PageHeader,
  TextField,
  NumberField,
  AddRowButton,
  DeleteRowButton,
  SaveBar,
} from './components/adminUi';
import { useSection } from './components/useSection';
import { cn } from '@/lib/cn';

type SaleRow = [number, number];

/** Trie le barème de chaque option par seuil croissant. */
function sortPlacements(placements: CatalogPlacement[]): CatalogPlacement[] {
  return placements.map((p) => ({
    ...p,
    salePrices: [...p.salePrices].sort((a, b) => a[0] - b[0]),
  }));
}

export default function ImpressionsPage() {
  const cat = useCatalog();
  // Toutes les options partagent la même échelle de seuils (union, report du
  // palier inférieur) — aucun prix effectif ne change.
  const initial = useMemo(() => normalizeZonesToSharedSeuils(cat.placements), [cat.placements]);
  return <OptionsEditor key={cat.version} initial={initial} families={cat.families} />;
}

function OptionsEditor({
  initial,
  families,
}: {
  initial: CatalogPlacement[];
  families: CatalogFamily[];
}) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, (placements) =>
    savePlacements(sortPlacements(placements)),
  );

  // Les seuils sont communs à toutes les options : on les lit sur la 1re.
  const seuils = draft[0]?.salePrices.map((r) => r[0]) ?? [];

  function updateOption(i: number, patch: Partial<CatalogPlacement>) {
    setDraft((d) => d.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function toggleFamily(i: number, familyId: string) {
    setDraft((d) =>
      d.map((p, idx) =>
        idx === i
          ? {
              ...p,
              families: p.families.includes(familyId)
                ? p.families.filter((f) => f !== familyId)
                : [...p.families, familyId],
            }
          : p,
      ),
    );
  }
  // Édite un seuil (la quantité) : s'applique à TOUTES les options.
  function updateSeuil(rowIndex: number, threshold: number) {
    setDraft((d) =>
      d.map((p) => ({
        ...p,
        salePrices: p.salePrices.map(
          (row, j): SaleRow => (j === rowIndex ? [threshold, row[1]] : row),
        ),
      })),
    );
  }
  function addSeuil() {
    setDraft((d) => {
      const maxSeuil = d[0]?.salePrices.reduce((m, [s]) => Math.max(m, s), 0) ?? 0;
      const next = maxSeuil + 10;
      return d.map((p) => {
        const carry = p.salePrices[p.salePrices.length - 1]?.[1] ?? 0;
        return { ...p, salePrices: [...p.salePrices, [next, carry] as SaleRow] };
      });
    });
  }
  function removeSeuil(rowIndex: number) {
    setDraft((d) =>
      d.map((p) => ({ ...p, salePrices: p.salePrices.filter((_, j) => j !== rowIndex) })),
    );
  }
  // Édite le prix d'une option à un seuil donné.
  function updatePrice(i: number, rowIndex: number, price: number) {
    setDraft((d) =>
      d.map((p, idx) =>
        idx === i
          ? {
              ...p,
              salePrices: p.salePrices.map(
                (row, j): SaleRow => (j === rowIndex ? [row[0], price] : row),
              ),
            }
          : p,
      ),
    );
  }
  // Auto-remplissage dégressif d'une option depuis son prix à l'unité (1re ligne),
  // suivant la courbe moyenne des AUTRES options. 'ifEmpty' = seulement si vide.
  function fillFromUnit(i: number, mode: 'ifEmpty' | 'force') {
    setDraft((d) => {
      const p = d[i];
      if (!p) return d;
      const restEmpty = p.salePrices.slice(1).every((r) => r[1] === 0);
      if (mode === 'ifEmpty' && !restEmpty) return d;
      const unit = p.salePrices[0]?.[1] ?? 0;
      const seuilsArr = p.salePrices.map((r) => r[0]);
      const refs = d.filter((pp, idx) => idx !== i && (pp.salePrices[0]?.[1] ?? 0) > 0);
      const prices = degressivePricesFromUnit(unit, seuilsArr, refs);
      return d.map((pp, idx) =>
        idx === i
          ? {
              ...pp,
              salePrices: pp.salePrices.map(
                (row, j): SaleRow => (j === 0 ? row : [row[0], prices[j] ?? 0]),
              ),
            }
          : pp,
      );
    });
  }
  function addOption() {
    setDraft((d) => [
      ...d,
      {
        id: '',
        label: '',
        zones: [],
        families: [],
        salePrices: seuils.map((s): SaleRow => [s, 0]),
      },
    ]);
  }
  function removeOption(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <PageHeader
        title="Impressions"
        subtitle="Les options d’impression proposées dans le devis. Chaque option a un nom, les familles où elle s’affiche, et son prix selon la quantité (saisissez le prix à l’unité, les paliers se remplissent tout seuls)."
      />

      {/* Paliers de quantité — communs à toutes les options */}
      <div className="mb-6 rounded-[var(--df-radius-lg)] border border-[var(--df-border)] bg-[var(--df-surface-2)] p-4">
        <span className="df-caps">Paliers de quantité (communs à toutes les options)</span>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {seuils.map((seuil, ri) => (
            <div
              key={ri}
              className="inline-flex items-center gap-1 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface)] pl-1 pr-0.5 py-0.5"
            >
              <NumberField
                value={seuil}
                onChange={(v) => {
                  updateSeuil(ri, v);
                }}
                allowDecimal={false}
                ariaLabel={`Palier de quantité ${String(ri + 1)}`}
                className="w-16"
              />
              <button
                type="button"
                onClick={() => {
                  removeSeuil(ri);
                }}
                aria-label={`Supprimer le palier ${String(seuil)}`}
                className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--df-radius)] text-[var(--df-ink-4)] hover:text-[var(--df-danger)]"
              >
                ×
              </button>
            </div>
          ))}
          <AddRowButton onClick={addSeuil} label="Ajouter un palier" />
        </div>
      </div>

      {/* Liste des options */}
      <div className="space-y-3">
        {draft.length === 0 && (
          <p className="text-sm text-[var(--df-ink-3)]">Aucune option. Ajoutez-en une.</p>
        )}
        {draft.map((p, i) => (
          <div
            key={i}
            className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] p-4"
          >
            {/* Nom + identifiant + actions */}
            <div className="flex items-center gap-2">
              <TextField
                value={p.label}
                onChange={(v) => {
                  updateOption(i, { label: v });
                }}
                placeholder="Nom affiché (ex. Coeur + Dos)"
                ariaLabel={`Nom de l’option ${String(i + 1)}`}
                className="flex-1"
              />
              <TextField
                value={p.id}
                onChange={(v) => {
                  updateOption(i, { id: v });
                }}
                placeholder="identifiant"
                ariaLabel={`Identifiant de l’option ${String(i + 1)}`}
                className="df-mono w-44"
              />
              <button
                type="button"
                onClick={() => {
                  fillFromUnit(i, 'force');
                }}
                title="Recalculer les paliers depuis le prix à l’unité"
                aria-label={`Recalculer ${p.label || String(i + 1)} depuis le prix à l’unité`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--df-radius)] text-[var(--df-ink-3)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-accent)]"
              >
                <RotateCcw size={15} strokeWidth={1.8} aria-hidden />
              </button>
              <DeleteRowButton
                onClick={() => {
                  removeOption(i);
                }}
                label={`Supprimer l’option ${p.label || String(i + 1)}`}
              />
            </div>

            {/* Familles */}
            <div className="mt-3">
              <span className="df-caps">
                Proposé pour ces familles{' '}
                <span className="normal-case font-normal text-[var(--df-ink-4)]">
                  — aucune = toutes
                </span>
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {families.length === 0 ? (
                  <span className="text-xs text-[var(--df-ink-3)]">Aucune famille définie.</span>
                ) : (
                  families.map((f) => {
                    const on = p.families.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          toggleFamily(i, f.id);
                        }}
                        className={cn(
                          'px-3 h-8 rounded-full text-xs font-medium border transition-colors',
                          on
                            ? 'bg-[var(--df-accent-soft)] text-[var(--df-accent)] border-[var(--df-accent)]'
                            : 'bg-[var(--df-surface-2)] text-[var(--df-ink-3)] border-[var(--df-border)] hover:text-[var(--df-ink)]',
                        )}
                      >
                        {f.label}
                      </button>
                    );
                  })
                )}
                {p.families.length === 0 && families.length > 0 && (
                  <span className="text-xs text-[var(--df-ink-3)] self-center">
                    (toutes les familles)
                  </span>
                )}
              </div>
            </div>

            {/* Prix par palier (le 1er = prix à l’unité, déclenche l’auto-remplissage) */}
            <div className="mt-3">
              <span className="df-caps">Prix par quantité</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {p.salePrices.map((row, ri) => (
                  <label
                    key={ri}
                    className="flex flex-col gap-1 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface-2)] px-2 py-1.5"
                  >
                    <span className="df-caps text-[10px] text-center">
                      {ri === 0 ? 'unité' : `≥ ${String(row[0])}`}
                    </span>
                    <NumberField
                      value={row[1]}
                      onChange={(v) => {
                        updatePrice(i, ri, v);
                      }}
                      onBlur={() => {
                        if (ri === 0) fillFromUnit(i, 'ifEmpty');
                      }}
                      suffix="€"
                      ariaLabel={`Prix ${p.label || String(i + 1)} pour quantité ${String(row[0])}`}
                      className="w-24"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <AddRowButton onClick={addOption} label="Ajouter une option" />
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

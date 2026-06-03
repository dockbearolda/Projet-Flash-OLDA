import { useMemo, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import type { CatalogZone, CatalogPlacement, CatalogFamily } from '@df/shared';
import {
  normalizeZonesToSharedSeuils,
  degressivePricesFromUnit,
  zoneSalePriceForQtyFrom,
} from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveZonesAndPlacements } from '@/features/catalog/api';
import {
  PageHeader,
  TextField,
  NumberField,
  AddRowButton,
  DeleteRowButton,
  SaveBar,
} from './components/adminUi';
import { useSection } from './components/useSection';
import { eur } from '@/lib/format';
import { cn } from '@/lib/cn';

type SaleRow = [number, number];
interface Draft {
  zones: CatalogZone[];
  placements: CatalogPlacement[];
}

/** Trie les paliers de chaque zone par seuil croissant (alignement conservé). */
function sortZones(zones: CatalogZone[]): CatalogZone[] {
  return zones.map((z) => ({
    ...z,
    salePrices: [...z.salePrices].sort((a, b) => a[0] - b[0]),
  }));
}

export default function ImpressionsPage() {
  const cat = useCatalog();
  // Seuils partagés : on fusionne (union) les seuils des zones en reportant le
  // palier inférieur — aucun prix effectif ne change.
  const initial = useMemo<Draft>(
    () => ({ zones: normalizeZonesToSharedSeuils(cat.zones), placements: cat.placements }),
    [cat.zones, cat.placements],
  );
  return <ImpressionsEditor key={cat.version} initial={initial} families={cat.families} />;
}

function ImpressionsEditor({ initial, families }: { initial: Draft; families: CatalogFamily[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, (v) =>
    saveZonesAndPlacements(sortZones(v.zones), v.placements),
  );

  const setZones = useCallback(
    (updater: (z: CatalogZone[]) => CatalogZone[]) => {
      setDraft((d) => ({ ...d, zones: updater(d.zones) }));
    },
    [setDraft],
  );
  const setPlacements = useCallback(
    (updater: (p: CatalogPlacement[]) => CatalogPlacement[]) => {
      setDraft((d) => ({ ...d, placements: updater(d.placements) }));
    },
    [setDraft],
  );

  return (
    <div>
      <PageHeader
        title="Impressions"
        subtitle="Vos zones d’impression et leurs prix, puis les placements (combinaisons de zones) proposés dans le devis — le tout sur un seul écran. Un seul « Enregistrer » met zones et placements à jour."
      />

      <section className="mb-9">
        <h2 className="df-display text-xl">Zones &amp; prix</h2>
        <p className="text-sm text-[var(--df-ink-3)] mt-0.5 mb-3">
          Prix de vente par zone selon la quantité ; les seuils (colonne de gauche) sont communs à
          toutes les zones. Nouvelle zone : saisissez le prix à la quantité 1, les paliers se
          remplissent automatiquement (↻ pour recalculer, ou modifiez une case à la main).
        </p>
        <ZonesGrid zones={draft.zones} setZones={setZones} />
      </section>

      <section>
        <h2 className="df-display text-xl">Placements</h2>
        <p className="text-sm text-[var(--df-ink-3)] mt-0.5 mb-3">
          Emplacements proposés dans le devis = combinaisons de zones. Cochez les zones incluses
          (leur somme donne le prix, affiché à droite) puis les familles concernées (aucune cochée ⇒
          toutes les familles).
        </p>
        <PlacementsList
          placements={draft.placements}
          setPlacements={setPlacements}
          zones={draft.zones}
          families={families}
        />
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

/* ── Section haut : grille zones × seuils ─────────────────────────────────── */
function ZonesGrid({
  zones,
  setZones,
}: {
  zones: CatalogZone[];
  setZones: (updater: (z: CatalogZone[]) => CatalogZone[]) => void;
}) {
  // Les seuils sont communs à toutes les zones : on les lit sur la 1re zone.
  const seuils = zones[0]?.salePrices.map((r) => r[0]) ?? [];

  function updateZone(zi: number, patch: Partial<CatalogZone>) {
    setZones((d) => d.map((z, i) => (i === zi ? { ...z, ...patch } : z)));
  }
  function updateSeuil(rowIndex: number, threshold: number) {
    setZones((d) =>
      d.map((z) => ({
        ...z,
        salePrices: z.salePrices.map(
          (row, j): SaleRow => (j === rowIndex ? [threshold, row[1]] : row),
        ),
      })),
    );
  }
  function updatePrice(zi: number, rowIndex: number, price: number) {
    setZones((d) =>
      d.map((z, i) =>
        i === zi
          ? {
              ...z,
              salePrices: z.salePrices.map(
                (row, j): SaleRow => (j === rowIndex ? [row[0], price] : row),
              ),
            }
          : z,
      ),
    );
  }
  function addSeuil() {
    setZones((d) => {
      const maxSeuil = d[0]?.salePrices.reduce((m, [s]) => Math.max(m, s), 0) ?? 0;
      const next = maxSeuil + 10;
      return d.map((z) => {
        const carry = z.salePrices[z.salePrices.length - 1]?.[1] ?? 0;
        return { ...z, salePrices: [...z.salePrices, [next, carry] as SaleRow] };
      });
    });
  }
  function removeSeuil(rowIndex: number) {
    setZones((d) =>
      d.map((z) => ({ ...z, salePrices: z.salePrices.filter((_, j) => j !== rowIndex) })),
    );
  }
  function addZone() {
    setZones((d) => [...d, { id: '', label: '', salePrices: seuils.map((s): SaleRow => [s, 0]) }]);
  }
  function removeZone(zi: number) {
    setZones((d) => d.filter((_, i) => i !== zi));
  }
  // Auto-remplissage dégressif d'une colonne depuis son prix unité (1re ligne),
  // suivant la courbe moyenne des AUTRES zones. 'ifEmpty' ne touche que les
  // colonnes vides (nouvelle zone) ; 'force' recalcule tout.
  function fillColumnFromUnit(zi: number, mode: 'ifEmpty' | 'force') {
    setZones((d) => {
      const z = d[zi];
      if (!z) return d;
      const restEmpty = z.salePrices.slice(1).every((r) => r[1] === 0);
      if (mode === 'ifEmpty' && !restEmpty) return d;
      const unit = z.salePrices[0]?.[1] ?? 0;
      const seuilsArr = z.salePrices.map((r) => r[0]);
      const refs = d.filter((zz, i) => i !== zi && (zz.salePrices[0]?.[1] ?? 0) > 0);
      const prices = degressivePricesFromUnit(unit, seuilsArr, refs);
      return d.map((zz, i) =>
        i === zi
          ? {
              ...zz,
              salePrices: zz.salePrices.map(
                (row, j): SaleRow => (j === 0 ? row : [row[0], prices[j] ?? 0]),
              ),
            }
          : zz,
      );
    });
  }

  if (zones.length === 0) {
    return (
      <p className="text-sm text-[var(--df-ink-3)]">Aucune zone. Ajoutez-en une pour commencer.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--df-radius-lg)] border border-[var(--df-border)] bg-[var(--df-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--df-border)] bg-[var(--df-surface-2)]">
              <th className="sticky left-0 z-10 bg-[var(--df-surface-2)] px-4 py-3 text-left align-bottom min-w-[7rem]">
                <span className="df-caps">Seuil ≥</span>
              </th>
              {zones.map((z, zi) => (
                <th
                  key={zi}
                  className="px-3 py-2.5 align-bottom border-l border-[var(--df-border)] min-w-[9rem]"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <TextField
                        value={z.label}
                        onChange={(v) => {
                          updateZone(zi, { label: v });
                        }}
                        placeholder="Nom (ex. Coeur)"
                        ariaLabel={`Nom de la zone ${String(zi + 1)}`}
                        className="flex-1 min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          fillColumnFromUnit(zi, 'force');
                        }}
                        title="Recalculer les paliers depuis le prix unité"
                        aria-label={`Recalculer ${z.label || String(zi + 1)} depuis le prix unité`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--df-radius)] text-[var(--df-ink-3)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-accent)]"
                      >
                        <RotateCcw size={15} strokeWidth={1.8} aria-hidden />
                      </button>
                      <DeleteRowButton
                        onClick={() => {
                          removeZone(zi);
                        }}
                        label={`Supprimer la zone ${z.label || String(zi + 1)}`}
                      />
                    </div>
                    <TextField
                      value={z.id}
                      onChange={(v) => {
                        updateZone(zi, { id: v });
                      }}
                      placeholder="identifiant (ex. coeur)"
                      ariaLabel={`Identifiant de la zone ${String(zi + 1)}`}
                      className="df-mono"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seuils.map((seuil, ri) => (
              <tr key={ri} className="border-b border-[var(--df-border)] last:border-b-0">
                <td className="sticky left-0 z-10 bg-[var(--df-surface)] px-4 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <NumberField
                      value={seuil}
                      onChange={(v) => {
                        updateSeuil(ri, v);
                      }}
                      allowDecimal={false}
                      ariaLabel={`Seuil ligne ${String(ri + 1)}`}
                      className="w-20"
                    />
                    <DeleteRowButton
                      onClick={() => {
                        removeSeuil(ri);
                      }}
                      label={`Supprimer le seuil ${String(seuil)}`}
                    />
                  </div>
                </td>
                {zones.map((z, zi) => (
                  <td key={zi} className="px-3 py-1.5 border-l border-[var(--df-border)]">
                    <NumberField
                      value={z.salePrices[ri]?.[1] ?? 0}
                      onChange={(v) => {
                        updatePrice(zi, ri, v);
                      }}
                      onBlur={() => {
                        if (ri === 0) fillColumnFromUnit(zi, 'ifEmpty');
                      }}
                      suffix="€"
                      ariaLabel={`Prix ${z.label || String(zi + 1)} au seuil ${String(seuil)}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AddRowButton onClick={addSeuil} label="Ajouter un seuil" />
        <AddRowButton onClick={addZone} label="Ajouter une zone" />
      </div>
    </>
  );
}

/* ── Section bas : placements (combinaisons de zones + familles) ──────────── */
function PlacementsList({
  placements,
  setPlacements,
  zones,
  families,
}: {
  placements: CatalogPlacement[];
  setPlacements: (updater: (p: CatalogPlacement[]) => CatalogPlacement[]) => void;
  zones: CatalogZone[];
  families: CatalogFamily[];
}) {
  const zonesById = useMemo(() => {
    const m: Record<string, CatalogZone | undefined> = {};
    for (const z of zones) m[z.id] = z;
    return m;
  }, [zones]);

  // Prix indicatif d'un placement = somme de ses zones à la quantité 1 (live).
  function placementUnitTotal(p: CatalogPlacement): number {
    return p.zones.reduce(
      (acc, zid) => acc + zoneSalePriceForQtyFrom(zonesById[zid]?.salePrices ?? [], 1),
      0,
    );
  }

  function update(i: number, patch: Partial<CatalogPlacement>) {
    setPlacements((d) => d.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function toggleZone(i: number, zoneId: string) {
    setPlacements((d) =>
      d.map((p, idx) =>
        idx === i
          ? {
              ...p,
              zones: p.zones.includes(zoneId)
                ? p.zones.filter((z) => z !== zoneId)
                : [...p.zones, zoneId],
            }
          : p,
      ),
    );
  }
  function toggleFamily(i: number, familyId: string) {
    setPlacements((d) =>
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

  return (
    <>
      <div className="space-y-3">
        {placements.map((p, i) => (
          <div
            key={i}
            className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] p-4"
          >
            <div className="flex items-center gap-2">
              <TextField
                value={p.label}
                onChange={(v) => {
                  update(i, { label: v });
                }}
                placeholder="Nom affiché (ex. Coeur + Dos)"
                ariaLabel={`Nom du placement ${String(i + 1)}`}
                className="flex-1"
              />
              <TextField
                value={p.id}
                onChange={(v) => {
                  update(i, { id: v });
                }}
                placeholder="identifiant"
                ariaLabel={`Identifiant du placement ${String(i + 1)}`}
                className="df-mono w-44"
              />
              {p.zones.length > 0 && (
                <span
                  className="df-mono text-sm tabular-nums whitespace-nowrap text-[var(--df-ink-2)]"
                  title="Somme des zones à la quantité 1 (indicatif)"
                >
                  ≈ {eur(placementUnitTotal(p))}/pc
                </span>
              )}
              <DeleteRowButton
                onClick={() => {
                  setPlacements((d) => d.filter((_, idx) => idx !== i));
                }}
                label={`Supprimer le placement ${String(i + 1)}`}
              />
            </div>

            {/* Zones incluses — leur somme donne le prix d’impression */}
            <div className="mt-3">
              <span className="df-caps">Zones d’impression incluses</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {zones.length === 0 ? (
                  <span className="text-xs text-[var(--df-ink-3)]">
                    Aucune zone définie ci-dessus.
                  </span>
                ) : (
                  zones.map((z) => {
                    const on = p.zones.includes(z.id);
                    return (
                      <button
                        key={z.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          toggleZone(i, z.id);
                        }}
                        className={cn(
                          'px-3 h-8 rounded-full text-xs font-medium border transition-colors',
                          on
                            ? 'bg-[var(--df-accent-soft)] text-[var(--df-accent)] border-[var(--df-accent)]'
                            : 'bg-[var(--df-surface-2)] text-[var(--df-ink-3)] border-[var(--df-border)] hover:text-[var(--df-ink)]',
                        )}
                      >
                        {z.label || z.id}
                      </button>
                    );
                  })
                )}
                {p.zones.length === 0 && zones.length > 0 && (
                  <span className="text-xs text-[var(--df-ink-3)] self-center">
                    (sans impression)
                  </span>
                )}
              </div>
            </div>

            {/* Familles où ce placement est proposé (vide ⇒ toutes) */}
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
          </div>
        ))}
      </div>

      <div className="mt-4">
        <AddRowButton
          onClick={() => {
            setPlacements((d) => [...d, { id: '', label: '', zones: [], families: [] }]);
          }}
          label="Ajouter un placement"
        />
      </div>
    </>
  );
}

import { Plus, Trash2 } from 'lucide-react';
import type { CatalogZone } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveZones } from '@/features/catalog/api';
import { PageHeader, TextField, NumberField, AddRowButton, SaveBar } from './components/adminUi';
import { useSection } from './components/useSection';

type SaleRow = [number, number];

export default function ZonesPage() {
  const cat = useCatalog();
  return <ZonesEditor key={cat.version} initial={cat.zones} />;
}

function sortZones(zones: CatalogZone[]): CatalogZone[] {
  return zones.map((z) => ({
    ...z,
    salePrices: [...z.salePrices].sort((a, b) => a[0] - b[0]),
  }));
}

function ZonesEditor({ initial }: { initial: CatalogZone[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, (zones) =>
    saveZones(sortZones(zones)),
  );

  function updateZone(zi: number, patch: Partial<CatalogZone>) {
    setDraft((d) => d.map((z, i) => (i === zi ? { ...z, ...patch } : z)));
  }
  function updateTier(zi: number, ti: number, pos: 0 | 1, value: number) {
    setDraft((d) =>
      d.map((z, i) =>
        i === zi
          ? {
              ...z,
              salePrices: z.salePrices.map(
                (row, j): SaleRow =>
                  j === ti ? (pos === 0 ? [value, row[1]] : [row[0], value]) : row,
              ),
            }
          : z,
      ),
    );
  }
  function addTier(zi: number) {
    setDraft((d) =>
      d.map((z, i) => (i === zi ? { ...z, salePrices: [...z.salePrices, [0, 0] as SaleRow] } : z)),
    );
  }
  function removeTier(zi: number, ti: number) {
    setDraft((d) =>
      d.map((z, i) =>
        i === zi ? { ...z, salePrices: z.salePrices.filter((_, j) => j !== ti) } : z,
      ),
    );
  }
  function addZone() {
    setDraft((d) => [...d, { id: '', label: '', salePrices: [[1, 0]] }]);
  }
  function removeZone(zi: number) {
    setDraft((d) => d.filter((_, i) => i !== zi));
  }

  return (
    <div>
      <PageHeader
        title="Prix d’impression (zones DTF)"
        subtitle="Prix de vente par zone selon la quantité. Le prix appliqué est celui du plus grand seuil ≤ quantité du devis. Le total d’une impression est la somme des zones du placement."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {draft.map((z, zi) => (
          <div
            key={zi}
            className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--df-border)] bg-[var(--df-surface-2)] flex items-center gap-2">
              <div className="flex-1 grid grid-cols-[1fr_1fr] gap-2">
                <TextField
                  value={z.label}
                  onChange={(v) => {
                    updateZone(zi, { label: v });
                  }}
                  placeholder="Nom (ex. Coeur)"
                  ariaLabel={`Nom de la zone ${String(zi + 1)}`}
                />
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
              <button
                type="button"
                onClick={() => {
                  removeZone(zi);
                }}
                aria-label={`Supprimer la zone ${z.label || String(zi + 1)}`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--df-radius)] text-[var(--df-ink-3)] hover:bg-[var(--df-surface)] hover:text-[var(--df-danger)]"
              >
                <Trash2 size={16} strokeWidth={1.7} aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-[1fr_1fr_36px] px-4 py-2 gap-2 border-b border-[var(--df-border)]">
              <div className="df-caps">Seuil ≥</div>
              <div className="df-caps">Prix vente</div>
              <div />
            </div>
            {z.salePrices.map((row, ti) => (
              <div
                key={ti}
                className="grid grid-cols-[1fr_1fr_36px] px-4 py-1.5 gap-2 items-center border-b border-[var(--df-border)] last:border-b-0"
              >
                <NumberField
                  value={row[0]}
                  onChange={(v) => {
                    updateTier(zi, ti, 0, v);
                  }}
                  allowDecimal={false}
                  ariaLabel={`Seuil zone ${z.label} ligne ${String(ti + 1)}`}
                />
                <NumberField
                  value={row[1]}
                  onChange={(v) => {
                    updateTier(zi, ti, 1, v);
                  }}
                  suffix="€"
                  ariaLabel={`Prix zone ${z.label} ligne ${String(ti + 1)}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    removeTier(zi, ti);
                  }}
                  aria-label={`Supprimer le palier ${String(ti + 1)} de ${z.label}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--df-radius)] text-[var(--df-ink-4)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-danger)]"
                >
                  <Trash2 size={14} strokeWidth={1.7} aria-hidden />
                </button>
              </div>
            ))}
            <div className="px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  addTier(zi);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[var(--df-radius)] text-xs font-medium text-[var(--df-ink-2)] border border-dashed border-[var(--df-border-strong)] hover:bg-[var(--df-surface-2)]"
              >
                <Plus size={14} strokeWidth={1.8} aria-hidden />
                Ajouter un palier
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <AddRowButton onClick={addZone} label="Ajouter une zone" />
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

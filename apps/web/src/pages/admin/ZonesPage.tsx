import { useMemo } from 'react';
import type { CatalogZone } from '@df/shared';
import { normalizeZonesToSharedSeuils } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveZones } from '@/features/catalog/api';
import {
  PageHeader,
  TextField,
  NumberField,
  AddRowButton,
  DeleteRowButton,
  SaveBar,
} from './components/adminUi';
import { useSection } from './components/useSection';

type SaleRow = [number, number];

export default function ZonesPage() {
  const cat = useCatalog();
  // Échelle de seuils partagée : on fusionne les seuils de toutes les zones
  // (union) en reportant les prix du palier inférieur — aucun prix effectif ne
  // change, mais toutes les zones s'affichent sur la même échelle.
  const initial = useMemo(() => normalizeZonesToSharedSeuils(cat.zones), [cat.zones]);
  return <ZonesEditor key={cat.version} initial={initial} />;
}

/** Trie les paliers de chaque zone par seuil croissant (alignement conservé). */
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

  // Les seuils sont communs à toutes les zones : on les lit sur la 1re zone.
  const seuils = draft[0]?.salePrices.map((r) => r[0]) ?? [];

  function updateZone(zi: number, patch: Partial<CatalogZone>) {
    setDraft((d) => d.map((z, i) => (i === zi ? { ...z, ...patch } : z)));
  }
  // Édite un seuil (colonne de gauche) : s'applique à TOUTES les zones.
  function updateSeuil(rowIndex: number, threshold: number) {
    setDraft((d) =>
      d.map((z) => ({
        ...z,
        salePrices: z.salePrices.map(
          (row, j): SaleRow => (j === rowIndex ? [threshold, row[1]] : row),
        ),
      })),
    );
  }
  // Édite le prix d'une zone à un seuil donné.
  function updatePrice(zi: number, rowIndex: number, price: number) {
    setDraft((d) =>
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
  // Ajoute un seuil (ligne) à toutes les zones, prix reporté du palier courant.
  function addSeuil() {
    setDraft((d) => {
      const maxSeuil = d[0]?.salePrices.reduce((m, [s]) => Math.max(m, s), 0) ?? 0;
      const next = maxSeuil + 10;
      return d.map((z) => {
        const carry = z.salePrices[z.salePrices.length - 1]?.[1] ?? 0;
        return { ...z, salePrices: [...z.salePrices, [next, carry] as SaleRow] };
      });
    });
  }
  // Retire un seuil (ligne) de toutes les zones.
  function removeSeuil(rowIndex: number) {
    setDraft((d) =>
      d.map((z) => ({ ...z, salePrices: z.salePrices.filter((_, j) => j !== rowIndex) })),
    );
  }
  function addZone() {
    setDraft((d) => [...d, { id: '', label: '', salePrices: seuils.map((s): SaleRow => [s, 0]) }]);
  }
  function removeZone(zi: number) {
    setDraft((d) => d.filter((_, i) => i !== zi));
  }

  return (
    <div>
      <PageHeader
        title="Prix d’impression (zones DTF)"
        subtitle="Grille de prix de vente par zone. Les seuils de quantité (colonne de gauche) sont communs à toutes les zones : modifiez-les ici et ça s’applique partout. Le prix appliqué est celui du plus grand seuil ≤ quantité ; le total d’une impression est la somme des zones du placement."
      />

      {draft.length === 0 ? (
        <p className="text-sm text-[var(--df-ink-3)] mb-4">
          Aucune zone. Ajoutez-en une pour commencer.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--df-radius-lg)] border border-[var(--df-border)] bg-[var(--df-surface)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--df-border)] bg-[var(--df-surface-2)]">
                <th className="sticky left-0 z-10 bg-[var(--df-surface-2)] px-4 py-3 text-left align-bottom min-w-[7rem]">
                  <span className="df-caps">Seuil ≥</span>
                </th>
                {draft.map((z, zi) => (
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
                  {draft.map((z, zi) => (
                    <td key={zi} className="px-3 py-1.5 border-l border-[var(--df-border)]">
                      <NumberField
                        value={z.salePrices[ri]?.[1] ?? 0}
                        onChange={(v) => {
                          updatePrice(zi, ri, v);
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
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <AddRowButton onClick={addSeuil} label="Ajouter un seuil" />
        <AddRowButton onClick={addZone} label="Ajouter une zone" />
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

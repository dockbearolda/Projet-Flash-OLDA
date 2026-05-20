import type { CatalogPlacement, CatalogZone } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { savePlacements } from '@/features/catalog/api';
import {
  PageHeader,
  TextField,
  DeleteRowButton,
  AddRowButton,
  SaveBar,
} from './components/adminUi';
import { useSection } from './components/useSection';
import { cn } from '@/lib/cn';

export default function PlacementsPage() {
  const cat = useCatalog();
  return <PlacementsEditor key={cat.version} initial={cat.placements} zones={cat.zones} />;
}

function PlacementsEditor({
  initial,
  zones,
}: {
  initial: CatalogPlacement[];
  zones: CatalogZone[];
}) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, savePlacements);

  function update(i: number, patch: Partial<CatalogPlacement>) {
    setDraft((d) => d.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function toggleZone(i: number, zoneId: string) {
    setDraft((d) =>
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

  return (
    <div>
      <PageHeader
        title="Placements"
        subtitle="Emplacements d’impression proposés dans le devis. Cochez les zones DTF incluses dans chaque placement — leur somme donne le prix d’impression."
      />

      <div className="space-y-3">
        {draft.map((p, i) => (
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
                className="df-mono w-56"
              />
              <DeleteRowButton
                onClick={() => {
                  setDraft((d) => d.filter((_, idx) => idx !== i));
                }}
                label={`Supprimer le placement ${String(i + 1)}`}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {zones.length === 0 ? (
                <span className="text-xs text-[var(--df-ink-3)]">
                  Aucune zone définie. Ajoutez des zones dans « Prix d’impression ».
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
                      {z.label}
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
        ))}
      </div>

      <div className="mt-4">
        <AddRowButton
          onClick={() => {
            setDraft((d) => [...d, { id: '', label: '', zones: [] }]);
          }}
          label="Ajouter un placement"
        />
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

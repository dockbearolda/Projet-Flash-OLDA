import type { CatalogFamily } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveFamilies } from '@/features/catalog/api';
import {
  PageHeader,
  TextField,
  DeleteRowButton,
  AddRowButton,
  SaveBar,
} from './components/adminUi';
import { useSection } from './components/useSection';

export default function FamiliesPage() {
  const cat = useCatalog();
  return <FamiliesEditor key={cat.version} initial={cat.families} />;
}

function FamiliesEditor({ initial }: { initial: CatalogFamily[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, saveFamilies);

  function update(i: number, patch: Partial<CatalogFamily>) {
    setDraft((d) => d.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  return (
    <div>
      <PageHeader
        title="Familles"
        subtitle="Catégories de produits (ex. Homme, Femme, Accessoire). L'ordre de la liste est l'ordre d'affichage dans les sélecteurs de produit. Une famille ne peut être supprimée tant que des produits y sont rattachés."
      />

      <div className="space-y-3">
        {draft.map((f, i) => (
          <div
            key={i}
            className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] p-4 flex items-center gap-2"
          >
            <TextField
              value={f.label}
              onChange={(v) => {
                update(i, { label: v });
              }}
              placeholder="Nom affiché (ex. Accessoire)"
              ariaLabel={`Nom de la famille ${String(i + 1)}`}
              className="flex-1"
            />
            <TextField
              value={f.id}
              onChange={(v) => {
                update(i, { id: v });
              }}
              placeholder="identifiant"
              ariaLabel={`Identifiant de la famille ${String(i + 1)}`}
              className="df-mono w-56"
            />
            <DeleteRowButton
              onClick={() => {
                setDraft((d) => d.filter((_, idx) => idx !== i));
              }}
              label={`Supprimer la famille ${String(i + 1)}`}
            />
          </div>
        ))}
        {draft.length === 0 && (
          <p className="text-sm text-[var(--df-ink-3)]">
            Aucune famille. Ajoutez-en une ci-dessous.
          </p>
        )}
      </div>

      <div className="mt-4">
        <AddRowButton
          onClick={() => {
            setDraft((d) => [...d, { id: '', label: '' }]);
          }}
          label="Ajouter une famille"
        />
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

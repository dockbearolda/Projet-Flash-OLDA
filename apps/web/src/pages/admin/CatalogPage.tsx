import type { CatalogProduct, ProductFamily } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveProducts } from '@/features/catalog/api';
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

const COLS = 'grid-cols-[110px_150px_1fr_160px_130px_44px]';

export default function CatalogPage() {
  const cat = useCatalog();
  return <ProductsEditor key={cat.version} initial={cat.products} />;
}

function ProductsEditor({ initial }: { initial: CatalogProduct[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, saveProducts);

  function update(i: number, patch: Partial<CatalogProduct>) {
    setDraft((d) => d.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }
  function add() {
    setDraft((d) => [
      ...d,
      { ref: '', supplierRef: '', name: '', family: 'unisexe', priceAchat: 0 },
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${draft.length} produits · modifiez référence, nom, famille et prix d’achat. Tout est repris dans le devis.`}
      />

      <Card>
        <div
          className={`grid ${COLS} px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)] gap-2`}
        >
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
          draft.map((p, i) => (
            <div
              key={i}
              className={`grid ${COLS} px-4 py-2 border-b border-[var(--df-border)] last:border-b-0 items-center gap-2`}
            >
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
          ))
        )}
        <div className="px-4 py-3 border-t border-[var(--df-border)]">
          <AddRowButton onClick={add} label="Ajouter un produit" />
        </div>
      </Card>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

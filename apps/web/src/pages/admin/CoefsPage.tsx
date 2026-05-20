import type { CatalogCoef } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveCoefs } from '@/features/catalog/api';
import {
  PageHeader,
  NumberField,
  DeleteRowButton,
  AddRowButton,
  SaveBar,
  Card,
} from './components/adminUi';
import { useSection } from './components/useSection';

const COLS = 'grid-cols-[1fr_1fr_44px]';

export default function CoefsPage() {
  const cat = useCatalog();
  return <CoefsEditor key={cat.version} initial={cat.coefs} />;
}

function sortByThreshold(rows: CatalogCoef[]): CatalogCoef[] {
  return [...rows].sort((a, b) => a[0] - b[0]);
}

function CoefsEditor({ initial }: { initial: CatalogCoef[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, (rows) =>
    saveCoefs(sortByThreshold(rows)),
  );

  function update(i: number, pos: 0 | 1, value: number) {
    setDraft((d) => d.map((row, idx) => (idx === i ? updateTuple(row, pos, value) : row)));
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }
  function add() {
    setDraft((d) => [...d, [0, 1] as CatalogCoef]);
  }

  return (
    <div>
      <PageHeader
        title="Coefficients de marge"
        subtitle="Le coefficient appliqué est celui du plus grand seuil ≤ quantité totale du devis. PU vierge = prix achat × coef (arrondi sup. 0,10 €)."
      />

      <Card className="max-w-2xl">
        <div
          className={`grid ${COLS} px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)] gap-2`}
        >
          <div className="df-caps">Seuil (pièces ≥)</div>
          <div className="df-caps">Coefficient ×</div>
          <div />
        </div>
        {draft.map((row, i) => (
          <div
            key={i}
            className={`grid ${COLS} px-4 py-2 border-b border-[var(--df-border)] last:border-b-0 items-center gap-2`}
          >
            <NumberField
              value={row[0]}
              onChange={(v) => {
                update(i, 0, v);
              }}
              allowDecimal={false}
              ariaLabel={`Seuil ligne ${String(i + 1)}`}
            />
            <NumberField
              value={row[1]}
              onChange={(v) => {
                update(i, 1, v);
              }}
              ariaLabel={`Coefficient ligne ${String(i + 1)}`}
            />
            <DeleteRowButton
              onClick={() => {
                remove(i);
              }}
              label={`Supprimer le palier ${String(i + 1)}`}
            />
          </div>
        ))}
        <div className="px-4 py-3 border-t border-[var(--df-border)]">
          <AddRowButton onClick={add} label="Ajouter un palier" />
        </div>
      </Card>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

function updateTuple(row: CatalogCoef, pos: 0 | 1, value: number): CatalogCoef {
  return pos === 0 ? [value, row[1]] : [row[0], value];
}

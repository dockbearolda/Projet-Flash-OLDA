import type { CatalogTextileColor, CatalogFlockColor } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveTextileColors, saveFlockColors } from '@/features/catalog/api';
import {
  PageHeader,
  TextField,
  DeleteRowButton,
  AddRowButton,
  SaveBar,
  Toggle,
  Card,
} from './components/adminUi';
import { useSection } from './components/useSection';

export default function ColorsPage() {
  const cat = useCatalog();
  return (
    <div className="space-y-10">
      <PageHeader
        title="Coloris"
        subtitle="Couleurs proposées dans le devis : textile (t-shirt) et flocage (impression)."
      />
      <TextileEditor key={`t-${String(cat.version)}`} initial={cat.textileColors} />
      <FlockEditor key={`f-${String(cat.version)}`} initial={cat.flockColors} />
    </div>
  );
}

function ColorInput({
  value,
  onChange,
  ariaLabel,
  disabled,
}: {
  value: string | null;
  onChange: (hex: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        className="inline-block w-9 h-9 rounded-[var(--df-radius)] border border-[var(--df-border)]"
        style={{
          background: 'conic-gradient(from 0deg, #c8261c, #f1c63a, #2c6041, #1f3aa8, #c8261c)',
        }}
        aria-hidden
      />
    );
  }
  return (
    <input
      type="color"
      value={value ?? '#000000'}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className="w-9 h-9 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-transparent cursor-pointer p-0.5"
    />
  );
}

const TEXTILE_COLS = 'grid-cols-[44px_150px_1fr_120px_44px]';

function TextileEditor({ initial }: { initial: CatalogTextileColor[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(
    initial,
    saveTextileColors,
  );

  function update(i: number, patch: Partial<CatalogTextileColor>) {
    setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <section>
      <h2 className="df-caps mb-3">Coloris textile · {draft.length}</h2>
      <Card>
        <div
          className={`grid ${TEXTILE_COLS} px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)] gap-2 items-center`}
        >
          <div className="df-caps">Couleur</div>
          <div className="df-caps">Identifiant</div>
          <div className="df-caps">Nom</div>
          <div className="df-caps">Mise en avant</div>
          <div />
        </div>
        {draft.map((c, i) => (
          <div
            key={i}
            className={`grid ${TEXTILE_COLS} px-4 py-2 border-b border-[var(--df-border)] last:border-b-0 items-center gap-2`}
          >
            <ColorInput
              value={c.hex}
              onChange={(hex) => {
                update(i, { hex });
              }}
              ariaLabel={`Couleur textile ${String(i + 1)}`}
            />
            <TextField
              value={c.id}
              onChange={(v) => {
                update(i, { id: v });
              }}
              placeholder="noir"
              ariaLabel={`Identifiant coloris ${String(i + 1)}`}
              className="df-mono"
            />
            <TextField
              value={c.name}
              onChange={(v) => {
                update(i, { name: v });
              }}
              placeholder="Noir"
              ariaLabel={`Nom coloris ${String(i + 1)}`}
            />
            <Toggle
              value={c.best}
              onChange={(v) => {
                update(i, { best: v });
              }}
              ariaLabel={`Mise en avant coloris ${String(i + 1)}`}
            />
            <DeleteRowButton
              onClick={() => {
                setDraft((d) => d.filter((_, idx) => idx !== i));
              }}
              label={`Supprimer le coloris ${String(i + 1)}`}
            />
          </div>
        ))}
        <div className="px-4 py-3 border-t border-[var(--df-border)]">
          <AddRowButton
            onClick={() => {
              setDraft((d) => [...d, { id: '', name: '', hex: '#000000', best: false }]);
            }}
            label="Ajouter un coloris textile"
          />
        </div>
      </Card>
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={onSave}
        onCancel={onCancel}
        sticky={false}
        label="Coloris textile modifiés"
      />
    </section>
  );
}

const FLOCK_COLS = 'grid-cols-[44px_150px_1fr_120px_44px]';

function FlockEditor({ initial }: { initial: CatalogFlockColor[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, saveFlockColors);

  function update(i: number, patch: Partial<CatalogFlockColor>) {
    setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <section>
      <h2 className="df-caps mb-3">Coloris flocage · {draft.length}</h2>
      <Card>
        <div
          className={`grid ${FLOCK_COLS} px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)] gap-2 items-center`}
        >
          <div className="df-caps">Couleur</div>
          <div className="df-caps">Identifiant</div>
          <div className="df-caps">Nom</div>
          <div className="df-caps">Multi couleurs</div>
          <div />
        </div>
        {draft.map((c, i) => (
          <div
            key={i}
            className={`grid ${FLOCK_COLS} px-4 py-2 border-b border-[var(--df-border)] last:border-b-0 items-center gap-2`}
          >
            <ColorInput
              value={c.hex}
              onChange={(hex) => {
                update(i, { hex });
              }}
              ariaLabel={`Couleur flocage ${String(i + 1)}`}
              disabled={c.special}
            />
            <TextField
              value={c.id}
              onChange={(v) => {
                update(i, { id: v });
              }}
              placeholder="or"
              ariaLabel={`Identifiant flocage ${String(i + 1)}`}
              className="df-mono"
            />
            <TextField
              value={c.name}
              onChange={(v) => {
                update(i, { name: v });
              }}
              placeholder="Or"
              ariaLabel={`Nom flocage ${String(i + 1)}`}
            />
            <Toggle
              value={c.special}
              onChange={(v) => {
                update(i, { special: v, hex: v ? null : (c.hex ?? '#000000') });
              }}
              ariaLabel={`Multi couleurs flocage ${String(i + 1)}`}
            />
            <DeleteRowButton
              onClick={() => {
                setDraft((d) => d.filter((_, idx) => idx !== i));
              }}
              label={`Supprimer le coloris flocage ${String(i + 1)}`}
            />
          </div>
        ))}
        <div className="px-4 py-3 border-t border-[var(--df-border)]">
          <AddRowButton
            onClick={() => {
              setDraft((d) => [...d, { id: '', name: '', hex: '#000000', special: false }]);
            }}
            label="Ajouter un coloris flocage"
          />
        </div>
      </Card>
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={onSave}
        onCancel={onCancel}
        sticky={false}
        label="Coloris flocage modifiés"
      />
    </section>
  );
}

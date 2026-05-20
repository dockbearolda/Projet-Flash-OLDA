import type { CatalogSettings, CatalogTransport } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveSettings } from '@/features/catalog/api';
import { PageHeader, TextField, NumberField, SaveBar, Card } from './components/adminUi';
import { useSection } from './components/useSection';

export default function SettingsPage() {
  const cat = useCatalog();
  const initial: CatalogSettings = { tgcaRate: cat.tgcaRate, transports: cat.transports };
  return <SettingsEditor key={cat.version} initial={initial} />;
}

const COLS = 'grid-cols-[140px_1fr_130px_1fr]';

function SettingsEditor({ initial }: { initial: CatalogSettings }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, saveSettings);

  function updateTransport(i: number, patch: Partial<CatalogTransport>) {
    setDraft((d) => ({
      ...d,
      transports: d.transports.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Réglages"
        subtitle="Taxe (TGCA) et options de transport. Ces valeurs s’appliquent au calcul des devis."
      />

      <section className="mb-8 max-w-md">
        <h2 className="df-caps mb-3">Taxe TGCA</h2>
        <Card>
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[var(--df-ink)]">Taux de TGCA</div>
              <div className="text-xs text-[var(--df-ink-3)] mt-0.5">
                Appliqué sauf revente. Ex. 4 %.
              </div>
            </div>
            <div className="w-28">
              <NumberField
                value={Math.round(draft.tgcaRate * 1000) / 10}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, tgcaRate: v / 100 }));
                }}
                suffix="%"
                ariaLabel="Taux de TGCA en pourcentage"
              />
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="df-caps mb-3">Transport</h2>
        <Card>
          <div
            className={`grid ${COLS} px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)] gap-2`}
          >
            <div className="df-caps">Identifiant</div>
            <div className="df-caps">Nom affiché</div>
            <div className="df-caps text-right">Surcoût / pièce</div>
            <div className="df-caps">Délai</div>
          </div>
          {draft.transports.map((t, i) => (
            <div
              key={t.id}
              className={`grid ${COLS} px-4 py-2 border-b border-[var(--df-border)] last:border-b-0 items-center gap-2`}
            >
              <span className="df-mono text-xs text-[var(--df-ink-3)]">{t.id}</span>
              <TextField
                value={t.label}
                onChange={(v) => {
                  updateTransport(i, { label: v });
                }}
                ariaLabel={`Nom transport ${t.id}`}
              />
              <NumberField
                value={t.surcharge}
                onChange={(v) => {
                  updateTransport(i, { surcharge: v });
                }}
                suffix="€"
                ariaLabel={`Surcoût transport ${t.id}`}
              />
              <TextField
                value={t.delay}
                onChange={(v) => {
                  updateTransport(i, { delay: v });
                }}
                placeholder="≈ 10 jours"
                ariaLabel={`Délai transport ${t.id}`}
              />
            </div>
          ))}
        </Card>
        <p className="text-xs text-[var(--df-ink-3)] mt-2">
          Les identifiants de transport sont fixes (utilisés par les devis). Vous pouvez modifier le
          nom, le surcoût et le délai.
        </p>
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

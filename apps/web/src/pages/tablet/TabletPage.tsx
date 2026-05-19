import { useEffect, useRef, useState } from 'react';
import { Plus, Table2, FileText as FileTextIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useQuoteStore, useQuoteTotals, attachIdbStorage } from '@/features/quote/quoteStore';
import { useHistoryStore, attachHistoryIdb } from '@/features/quote/historyStore';
import { nextQuoteId } from '@/features/quote/quoteId';
import { lineQty } from '@/features/quote/pricing';
import { LineRow, CustomerInline, PricingGrid, RecapDrawer } from '@/features/quote/components';
import { SegToggle } from '@/components/ui/SegToggle';
import { fmtShortDate } from '@/lib/format';

attachIdbStorage();
attachHistoryIdb();

const VIEW_OPTIONS = [
  {
    value: 'devis' as const,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <FileTextIcon size={14} strokeWidth={1.8} aria-hidden /> Devis
      </span>
    ),
  },
  {
    value: 'grille' as const,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Table2 size={14} strokeWidth={1.8} aria-hidden /> Grille
      </span>
    ),
  },
];

export default function TabletPage() {
  const [view, setView] = useState<'devis' | 'grille'>('devis');
  const id = useQuoteStore((s) => s.id);
  const customer = useQuoteStore((s) => s.customer);
  const lines = useQuoteStore((s) => s.lines);
  const transport = useQuoteStore((s) => s.transport);
  const revente = useQuoteStore((s) => s.revente);
  const updatedAt = useQuoteStore((s) => s.updatedAt);

  const addLine = useQuoteStore((s) => s.addLine);
  const removeLine = useQuoteStore((s) => s.removeLine);
  const updateLine = useQuoteStore((s) => s.updateLine);
  const setSizes = useQuoteStore((s) => s.setSizes);
  const setFlockMode = useQuoteStore((s) => s.setFlockMode);
  const setLinked = useQuoteStore((s) => s.setLinked);
  const setLineTransport = useQuoteStore((s) => s.setLineTransport);
  const setLineRevente = useQuoteStore((s) => s.setLineRevente);
  const setCustomer = useQuoteStore((s) => s.setCustomer);
  const setTransport = useQuoteStore((s) => s.setTransport);
  const setRevente = useQuoteStore((s) => s.setRevente);

  const totals = useQuoteTotals();

  useEffect(() => {
    if (id === 'DEV-PENDING') {
      useQuoteStore.setState({ id: nextQuoteId() });
    }
  }, [id]);

  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (id === 'DEV-PENDING') return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const qty = lines.reduce((acc, l) => acc + lineQty(l.sizes), 0);
      if (qty === 0 && customer.name.trim() === '') return;
      useHistoryStore.getState().upsert({
        id,
        status: 'draft',
        customer,
        transport,
        revente,
        lines,
        totalHT: totals.totalHT,
        qtyTotal: totals.qtyTotal,
        createdAt: useQuoteStore.getState().createdAt,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [id, customer, transport, revente, lines, totals.totalHT, totals.qtyTotal]);

  function handleGenerate() {
    void (async () => {
      try {
        toast.loading('Génération du PDF…', { id: 'pdf' });
        const { QuotePdf } = await import('@/features/pdf/QuotePdf');
        const { downloadPdf } = await import('@/features/pdf/generate');
        const createdAt = useQuoteStore.getState().createdAt;
        await downloadPdf(
          `${id}.pdf`,
          <QuotePdf
            id={id}
            customer={customer}
            lines={lines.filter((l) => l.linked)}
            transport={transport}
            revente={revente}
            totals={totals}
            createdAt={createdAt}
          />,
        );
        toast.success('PDF généré', { id: 'pdf', description: `${id}.pdf téléchargé` });
      } catch (err) {
        console.error('PDF generation failed', err);
        toast.error('Échec génération PDF', { id: 'pdf' });
      }
    })();
  }

  function handleExportJSON() {
    const blob = new Blob(
      [JSON.stringify({ id, customer, transport, revente, lines, totals }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeLine = lines.find((l) => l.id === useQuoteStore.getState().activeLineId) ?? lines[0];

  return (
    <div className="flex min-h-screen bg-[var(--df-bg)]">
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 border-b border-[var(--df-border)] bg-[var(--df-surface)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="df-caps">Devis Flash · OLDA · SXM</div>
              <div className="df-display text-2xl">Nouveau devis</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="df-mono text-sm text-[var(--df-ink-3)]">{id}</span>
              <span className="text-xs text-[var(--df-ink-4)]">·</span>
              <span className="text-xs text-[var(--df-ink-3)]">{fmtShortDate(updatedAt)}</span>
            </div>
            <SegToggle
              value={view}
              onChange={setView}
              options={VIEW_OPTIONS}
              ariaLabel="Mode d'affichage"
            />
          </div>
          <CustomerInline customer={customer} onChange={setCustomer} />
        </header>

        <div className="flex-1 px-6 py-5 flex flex-col gap-5 overflow-y-auto">
          {view === 'grille' ? (
            <PricingGrid
              defaultRef={activeLine?.productRef ?? 'H-001'}
              defaultPlacement={activeLine?.placementId ?? 'coeur-dos'}
            />
          ) : (
            <>
              {lines.map((line, i) => (
                <LineRow
                  key={line.id}
                  index={i}
                  line={line}
                  quoteQty={totals.qtyTotal}
                  transport={transport}
                  revente={revente}
                  canRemove={lines.length > 1}
                  onChange={(patch) => {
                    updateLine(line.id, patch);
                  }}
                  onSizes={(s) => {
                    setSizes(line.id, s);
                  }}
                  onFlockMode={(m) => {
                    setFlockMode(line.id, m);
                  }}
                  onLinked={(b) => {
                    setLinked(line.id, b);
                  }}
                  onLineTransport={(t) => {
                    setLineTransport(line.id, t);
                  }}
                  onLineRevente={(b) => {
                    setLineRevente(line.id, b);
                  }}
                  onRemove={() => {
                    removeLine(line.id);
                  }}
                />
              ))}

              <button
                type="button"
                onClick={addLine}
                className="flex items-center justify-center gap-2 h-14 rounded-[var(--df-radius-lg)] border-2 border-dashed border-[var(--df-border-strong)] text-[var(--df-ink-2)] text-sm font-medium hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)] transition-colors"
              >
                <Plus size={18} strokeWidth={1.8} aria-hidden />
                Ajouter une référence
              </button>
            </>
          )}
        </div>
      </main>

      <RecapDrawer
        quoteId={id}
        customer={customer}
        lines={lines.filter((l) => l.linked)}
        totals={totals}
        transport={transport}
        revente={revente}
        onTransport={setTransport}
        onRevente={setRevente}
        onGeneratePDF={handleGenerate}
        onExportJSON={handleExportJSON}
      />
    </div>
  );
}

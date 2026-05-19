import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useQuoteStore, useQuoteTotals, attachIdbStorage } from '@/features/quote/quoteStore';
import { useHistoryStore, attachHistoryIdb } from '@/features/quote/historyStore';
import { nextQuoteId } from '@/features/quote/quoteId';
import { lineQty } from '@/features/quote/pricing';
import { Card, CardHeader, CardBody } from '@/components/ui';
import {
  ProductPicker,
  PlacementPicker,
  QtyGrid,
  TextilePicker,
  FlockPicker,
  CustomerInline,
  LineTabs,
  RecapDrawer,
} from '@/features/quote/components';
import { unitPriceHT } from '@/features/quote/pricing';
import { fmtEUR, fmtShortDate } from '@/lib/format';

attachIdbStorage();
attachHistoryIdb();

export default function TabletPage() {
  const id = useQuoteStore((s) => s.id);
  const customer = useQuoteStore((s) => s.customer);
  const lines = useQuoteStore((s) => s.lines);
  const activeLineId = useQuoteStore((s) => s.activeLineId);
  const transport = useQuoteStore((s) => s.transport);
  const revente = useQuoteStore((s) => s.revente);
  const updatedAt = useQuoteStore((s) => s.updatedAt);

  const addLine = useQuoteStore((s) => s.addLine);
  const removeLine = useQuoteStore((s) => s.removeLine);
  const setActive = useQuoteStore((s) => s.setActive);
  const updateLine = useQuoteStore((s) => s.updateLine);
  const setSizes = useQuoteStore((s) => s.setSizes);
  const setFlockMode = useQuoteStore((s) => s.setFlockMode);
  const setCustomer = useQuoteStore((s) => s.setCustomer);
  const setTransport = useQuoteStore((s) => s.setTransport);
  const setRevente = useQuoteStore((s) => s.setRevente);

  const totals = useQuoteTotals();

  const active = useMemo(
    () => lines.find((l) => l.id === activeLineId) ?? lines[0],
    [lines, activeLineId],
  );

  useEffect(() => {
    if (id === 'DEV-PENDING') {
      useQuoteStore.setState({ id: nextQuoteId() });
    }
  }, [id]);

  // Auto-save to history (debounced 800ms)
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (id === 'DEV-PENDING') return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const qty = lines.reduce((acc, l) => acc + lineQty(l.sizes), 0);
      if (qty === 0 && customer.name.trim() === '') return; // skip empty drafts
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

  if (!active) {
    return null;
  }

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
            lines={lines}
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

  const unit = (() => {
    try {
      return unitPriceHT({
        productRef: active.productRef,
        placementId: active.placementId,
        coef: totals.coef,
      });
    } catch {
      return 0;
    }
  })();

  return (
    <div className="flex min-h-screen bg-[var(--df-bg)]">
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
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
          </div>
          <CustomerInline customer={customer} onChange={setCustomer} />
        </header>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <LineTabs
            lines={lines}
            activeId={activeLineId}
            onSelect={setActive}
            onAdd={addLine}
            onRemove={removeLine}
          />
        </div>

        {/* Sections grid */}
        <div className="flex-1 px-6 py-4 grid grid-cols-2 gap-4 min-h-0">
          <Card>
            <CardHeader>
              <div className="df-caps">Produit textile</div>
            </CardHeader>
            <CardBody>
              <ProductPicker
                value={active.productRef}
                onChange={(ref) => {
                  updateLine(active.id, { productRef: ref });
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="df-caps">Coloris textile</div>
            </CardHeader>
            <CardBody>
              <TextilePicker
                value={active.textileColorId}
                onChange={(id) => {
                  updateLine(active.id, { textileColorId: id });
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="df-caps">Placement DTF</div>
            </CardHeader>
            <CardBody>
              <PlacementPicker
                value={active.placementId}
                onChange={(id) => {
                  updateLine(active.id, { placementId: id });
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="df-caps">Quantités par taille</div>
            </CardHeader>
            <CardBody className="space-y-4">
              <QtyGrid
                sizes={active.sizes}
                onChange={(s) => {
                  setSizes(active.id, s);
                }}
              />
              <div className="flex items-baseline justify-between pt-2 border-t border-[var(--df-border)]">
                <div>
                  <div className="df-caps">Prix unitaire HT</div>
                  <div className="text-[11px] text-[var(--df-ink-3)] mt-0.5">
                    avec coef {totals.coef.toFixed(2)} sur Σ qté devis
                  </div>
                </div>
                <output
                  role="status"
                  aria-live="polite"
                  className="df-display text-3xl tabular-nums"
                >
                  {fmtEUR.format(unit)}
                </output>
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-2">
            <CardHeader>
              <div className="df-caps">Coloris flocage</div>
            </CardHeader>
            <CardBody>
              <FlockPicker
                mode={active.flockMode}
                color={active.flockColorId}
                onMode={(m) => {
                  setFlockMode(active.id, m);
                }}
                onColor={(c) => {
                  updateLine(active.id, { flockColorId: c });
                }}
              />
            </CardBody>
          </Card>
        </div>
      </main>

      <RecapDrawer
        quoteId={id}
        customer={customer}
        lines={lines}
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

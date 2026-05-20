import { useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  PRODUCT_BY_REF,
  PLACEMENT_BY_ID,
  TEXTILE_COLOR_BY_ID,
  FLOCK_COLOR_BY_ID,
  TRANSPORT_OPTIONS,
  SIZE_KEYS,
  SIZE_LABELS,
} from '@df/shared';
import type {
  Customer,
  QuoteLine,
  Transport,
  Placement,
  TextileColor,
  FlockColor,
} from '@df/shared';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SyncIndicator } from '@/components/SyncIndicator';
import { fmtEUR, fmtCoef, fmtInt } from '@/lib/format';
import { lineQty, unitPriceBreakdown, lineSubtotalHT } from '../pricing';
import type { QuoteTotals } from '../pricing';
import { TransportPicker } from './TransportPicker';
import { ReventeToggle } from './ReventeToggle';

interface Props {
  quoteId: string;
  customer: Customer;
  lines: QuoteLine[];
  totals: QuoteTotals;
  transport: Transport;
  revente: boolean;
  onTransport: (t: Transport) => void;
  onRevente: (v: boolean) => void;
  onGeneratePDF: () => void;
  onExportJSON: () => void;
  /** Largeur du panneau en px (réglable par l'utilisateur). */
  width?: number;
}

export function RecapDrawer({
  quoteId,
  customer,
  lines,
  totals,
  transport,
  revente,
  onTransport,
  onRevente,
  onGeneratePDF,
  onExportJSON,
  width = 460,
}: Props) {
  const enriched = useMemo(
    () => lines.map((l) => enrichLine(l, totals.qtyTotal, transport, revente)),
    [lines, totals.qtyTotal, transport, revente],
  );
  const customerName = customer.name.trim() || 'Client non renseigné';

  return (
    <aside
      style={{ width }}
      className="shrink-0 h-screen bg-[var(--df-surface)] border-l border-[var(--df-border)] flex flex-col"
    >
      <div className="px-6 py-5 border-b border-[var(--df-border)]">
        <div className="flex items-baseline justify-between gap-2">
          <div className="df-caps">{quoteId}</div>
          <SyncIndicator />
        </div>
        <div className="df-display text-3xl mt-1">{customerName}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <div className="df-caps mb-2">Lignes · {fmtInt.format(lines.length)}</div>
          <div className="space-y-2">
            {enriched.map((e, i) => (
              <div
                key={e.line.id}
                className="rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-bg)] px-3 py-2.5"
              >
                {/* Réf + nom + PU HT */}
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="df-caps shrink-0">#{i + 1}</span>
                    <span className="df-mono text-[11px] text-[var(--df-ink-3)] shrink-0">
                      {e.ref}
                    </span>
                    <span className="text-xs font-medium text-[var(--df-ink)] truncate">
                      {e.name}
                    </span>
                  </div>
                  <div className="df-mono text-[11px] tabular-nums text-[var(--df-ink-3)] shrink-0">
                    {e.unitHT != null ? `${fmtEUR.format(e.unitHT)}/u` : '—'}
                  </div>
                </div>

                {/* Placement + quantité */}
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <div className="text-[11px] text-[var(--df-ink-3)] truncate">
                    {e.placement?.label ?? '—'}
                  </div>
                  <div className="df-mono text-xs tabular-nums text-[var(--df-ink-2)]">
                    × {fmtInt.format(e.qty)}
                  </div>
                </div>

                {/* Coloris + flocage */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {e.textile && (
                    <Chip>
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: e.textile.hex }}
                      />
                      {e.textile.name}
                    </Chip>
                  )}
                  {e.flockLabel && <Chip variant="accent">{e.flockLabel}</Chip>}
                </div>

                {/* Détail des tailles */}
                {e.sizesText && (
                  <div className="df-mono text-[11px] text-[var(--df-ink-3)] mt-2 tabular-nums">
                    {e.sizesText}
                  </div>
                )}

                {/* Transport + délai + TGCA */}
                <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-[var(--df-ink-3)]">
                  <span className="truncate">
                    {e.transportLabel} · {e.transportDelay}
                  </span>
                  <span className="shrink-0">{e.tgcaLabel}</span>
                </div>

                {/* Note */}
                {e.note && (
                  <div className="text-[11px] text-[var(--df-ink-2)] mt-2 italic border-l-2 border-[var(--df-accent)] pl-2">
                    {e.note}
                  </div>
                )}

                {/* Sous-total ligne */}
                <div className="flex items-baseline justify-between gap-2 mt-2 pt-2 border-t border-[var(--df-border)]">
                  <span className="df-caps">Sous-total</span>
                  <span className="df-mono text-sm tabular-nums font-semibold text-[var(--df-ink)]">
                    {e.subtotalHT != null ? fmtEUR.format(e.subtotalHT) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="df-caps mb-2">Transport</div>
          <TransportPicker value={transport} onChange={onTransport} />
        </div>

        <div>
          <ReventeToggle value={revente} onChange={onRevente} />
        </div>

        <div className="space-y-1.5">
          <Row label="Sous-total HT" value={fmtEUR.format(totals.subtotalHT)} />
          <Row
            label="Transport"
            value={totals.transportHT > 0 ? fmtEUR.format(totals.transportHT) : 'Gratuit'}
            muted={totals.transportHT === 0}
          />
          <Row
            label="TGCA 4 %"
            value={revente ? 'Exonéré — revente' : fmtEUR.format(totals.tgcaHT)}
            muted={revente}
          />
          <div className="pt-3 mt-3 border-t border-[var(--df-border)]">
            <div className="flex items-baseline justify-between">
              <div className="df-caps">Total HT</div>
              <div className="flex items-center gap-3">
                <Chip variant="accent">
                  {fmtInt.format(totals.qtyTotal)} pièces · ×{fmtCoef.format(totals.coef)}
                </Chip>
              </div>
            </div>
            <output
              role="status"
              aria-live="polite"
              className="df-display text-5xl mt-1 block tabular-nums"
            >
              {fmtEUR.format(totals.totalHT)}
            </output>
            {totals.qtyTotal > 0 && (
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-xs text-[var(--df-ink-3)]">
                  Prix moyen / pièce (avec transport)
                </div>
                <div className="df-mono text-sm tabular-nums text-[var(--df-ink-2)]">
                  {fmtEUR.format((totals.subtotalHT + totals.transportHT) / totals.qtyTotal)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-[var(--df-border)] flex flex-col gap-2">
        <Button variant="primary" size="lg" onClick={onGeneratePDF}>
          <FileText size={18} strokeWidth={1.8} />
          Générer le PDF
        </Button>
        <Button onClick={onExportJSON}>
          <Download size={16} strokeWidth={1.8} />
          Exporter JSON
        </Button>
      </div>
    </aside>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="text-sm text-[var(--df-ink-2)]">{label}</div>
      <div
        className={
          muted
            ? 'df-mono text-sm text-[var(--df-ink-3)]'
            : 'df-mono text-sm text-[var(--df-ink)] tabular-nums'
        }
      >
        {value}
      </div>
    </div>
  );
}

function enrichLine(
  line: QuoteLine,
  quoteQty: number,
  quoteTransport: Transport,
  quoteRevente: boolean,
) {
  const product = PRODUCT_BY_REF[line.productRef];
  const placement = (PLACEMENT_BY_ID as Record<string, Placement | undefined>)[line.placementId];
  const textile = (TEXTILE_COLOR_BY_ID as Record<string, TextileColor | undefined>)[
    line.textileColorId
  ];
  const flockTable = FLOCK_COLOR_BY_ID as Record<string, FlockColor | undefined>;
  const flockLabel =
    line.flockMode === 'multi'
      ? 'Multi couleurs'
      : line.flockColorId
        ? (flockTable[line.flockColorId]?.name ?? 'Flocage')
        : 'Couleur ?';

  const ref = line.custom ? 'Libre' : (product?.ref ?? '—');
  const name = line.custom?.name ?? product?.name ?? 'Produit ?';

  const sizesText = SIZE_KEYS.filter((k) => line.sizes[k] > 0)
    .map((k) => `${SIZE_LABELS[k]}·${String(line.sizes[k])}`)
    .join('  ');

  const transportId = line.transport ?? quoteTransport;
  const transportOpt = TRANSPORT_OPTIONS.find((t) => t.id === transportId);
  const transportLabel = transportOpt?.label ?? transportId;
  const transportDelay = transportOpt?.delay ?? '—';

  const isRevente = line.revente ?? quoteRevente;
  const tgcaLabel = isRevente ? 'TGCA exonérée' : 'TGCA 4 %';

  let unitHT: number | null = null;
  let subtotalHT: number | null = null;
  if (quoteQty > 0) {
    try {
      unitHT = unitPriceBreakdown({
        productRef: line.productRef,
        placementId: line.placementId,
        qty: quoteQty,
        code: line.code,
        priceAchatOverride: line.custom?.priceAchat,
      }).unitHT;
      subtotalHT = lineSubtotalHT(line, quoteQty);
    } catch {
      unitHT = null;
      subtotalHT = null;
    }
  }

  return {
    line,
    product,
    placement,
    textile,
    flockLabel,
    ref,
    name,
    sizesText,
    transportLabel,
    transportDelay,
    tgcaLabel,
    note: line.note?.trim() ?? '',
    unitHT,
    subtotalHT,
    qty: lineQty(line.sizes),
  };
}

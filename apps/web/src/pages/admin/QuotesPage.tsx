import { useMemo, useState } from 'react';
import { Archive, Copy, Trash2, FileText, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useHistoryStore } from '@/features/quote/historyStore';
import { useQuoteStore } from '@/features/quote/quoteStore';
import { nextQuoteId, newLineId } from '@/features/quote/quoteId';
import { Chip } from '@/components/ui';
import { fmtEUR, fmtInt, fmtShortDate } from '@/lib/format';
import { quoteTotals } from '@/features/quote/pricing';
import { cn } from '@/lib/cn';
import type { HistoryEntry } from '@/features/quote/historyStore';

const PAGE_SIZE = 50;

export default function QuotesPage() {
  const entries = useHistoryStore((s) => s.entries);
  const removeEntry = useHistoryStore((s) => s.remove);
  const archiveEntry = useHistoryStore((s) => s.archive);
  const restoreEntry = useHistoryStore((s) => s.restore);
  const markSent = useHistoryStore((s) => s.markSent);

  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const visible = useMemo(() => {
    const list = entries.filter((e) =>
      showArchived ? e.deletedAt !== null : e.deletedAt === null,
    );
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [entries, showArchived]);

  const paged = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const active = visible.find((e) => e.id === activeId) ?? paged[0];

  function duplicate(entry: HistoryEntry) {
    const id = nextQuoteId();
    const newLines = entry.lines.map((l) => ({ ...l, id: newLineId() }));
    useQuoteStore.setState({
      id,
      status: 'draft',
      customer: entry.customer,
      transport: entry.transport,
      revente: entry.revente,
      lines: newLines,
      activeLineId: newLines[0]?.id ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    toast.success('Devis dupliqué', { description: id });
    navigate('/tablet');
  }

  function edit(entry: HistoryEntry) {
    useQuoteStore.setState({
      id: entry.id,
      status: entry.status,
      customer: entry.customer,
      transport: entry.transport,
      revente: entry.revente,
      lines: entry.lines,
      activeLineId: entry.lines[0]?.id ?? '',
      createdAt: entry.createdAt,
      updatedAt: new Date().toISOString(),
    });
    navigate('/tablet');
  }

  async function resend(entry: HistoryEntry) {
    try {
      const { buildDevisHtml, devisPdfFilename } = await import('@/features/pdf/devisTemplate');
      const { downloadDevisPdf } = await import('@/features/pdf/downloadDevisPdf');
      const totals = quoteTotals({
        lines: entry.lines,
        transport: entry.transport,
        revente: entry.revente,
      });
      const html = buildDevisHtml({
        id: entry.id,
        customer: entry.customer,
        lines: entry.lines.filter((l) => l.linked),
        transport: entry.transport,
        revente: entry.revente,
        totals,
        createdAt: entry.createdAt,
      });
      await downloadDevisPdf(html, devisPdfFilename(entry.customer, entry.createdAt));
      markSent(entry.id);
      toast.success('Devis téléchargé', {
        id: 'pdf',
        description: 'Le PDF est dans tes téléchargements.',
      });
    } catch (err) {
      console.error('PDF resend failed', err);
      toast.error('Échec génération PDF', { id: 'pdf' });
    }
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h1 className="df-display text-3xl">Historique</h1>
            <p className="text-sm text-[var(--df-ink-3)] mt-1">
              {fmtInt.format(visible.length)} devis · tri par date desc
            </p>
          </div>
          <div className="inline-flex p-[3px] rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)]">
            <button
              type="button"
              onClick={() => {
                setShowArchived(false);
              }}
              className={cn(
                'px-3 h-8 text-xs font-medium rounded-[calc(var(--df-radius)-3px)] transition-colors',
                !showArchived
                  ? 'bg-[var(--df-surface)] text-[var(--df-ink)] shadow-[var(--df-shadow-1)]'
                  : 'bg-transparent text-[var(--df-ink-2)]',
              )}
            >
              Actifs
            </button>
            <button
              type="button"
              onClick={() => {
                setShowArchived(true);
              }}
              className={cn(
                'px-3 h-8 text-xs font-medium rounded-[calc(var(--df-radius)-3px)] transition-colors',
                showArchived
                  ? 'bg-[var(--df-surface)] text-[var(--df-ink)] shadow-[var(--df-shadow-1)]'
                  : 'bg-transparent text-[var(--df-ink-2)]',
              )}
            >
              Corbeille
            </button>
          </div>
        </div>

        <div className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] overflow-hidden">
          <div className="grid grid-cols-[120px_1fr_140px_100px_120px_120px] px-4 py-2.5 border-b border-[var(--df-border)] bg-[var(--df-surface-2)]">
            <div className="df-caps">Réf</div>
            <div className="df-caps">Client</div>
            <div className="df-caps">Lignes / Qté</div>
            <div className="df-caps">Statut</div>
            <div className="df-caps text-right">Total HT</div>
            <div className="df-caps text-right">Date</div>
          </div>
          {paged.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[var(--df-ink-3)]">
              Aucun devis pour le moment. Le bouton « Nouveau devis » dans la nav crée un brouillon.
            </div>
          ) : (
            paged.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setActiveId(e.id);
                }}
                className={cn(
                  'w-full grid grid-cols-[120px_1fr_140px_100px_120px_120px] px-4 py-2.5 text-left transition-colors border-b border-[var(--df-border)] last:border-b-0',
                  active?.id === e.id
                    ? 'bg-[var(--df-accent-soft)]'
                    : 'bg-[var(--df-surface)] hover:bg-[var(--df-bg-2)]',
                )}
              >
                <span className="df-mono text-xs text-[var(--df-ink)]">{e.id}</span>
                <span className="text-sm font-medium truncate text-[var(--df-ink)]">
                  {(e.customer.company?.trim() ?? '') || e.customer.name || '— sans nom —'}
                </span>
                <span className="df-mono text-xs text-[var(--df-ink-2)]">
                  {fmtInt.format(e.lines.length)} · {fmtInt.format(e.qtyTotal)} pcs
                </span>
                <span>
                  <StatusChip status={e.status} />
                </span>
                <span className="df-mono text-xs text-right text-[var(--df-ink)] tabular-nums">
                  {fmtEUR.format(e.totalHT)}
                </span>
                <span className="text-xs text-right text-[var(--df-ink-3)]">
                  {fmtShortDate(e.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>

        {visible.length > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-4">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => {
                setPage((p) => Math.max(0, p - 1));
              }}
              className="px-3 h-9 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-xs font-medium disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="text-xs text-[var(--df-ink-3)]">
              Page {page + 1} / {Math.ceil(visible.length / PAGE_SIZE)}
            </span>
            <button
              type="button"
              disabled={(page + 1) * PAGE_SIZE >= visible.length}
              onClick={() => {
                setPage((p) => p + 1);
              }}
              className="px-3 h-9 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-xs font-medium disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      <aside className="w-[380px] shrink-0">
        {active ? (
          <div className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] p-5 sticky top-20">
            <div className="df-caps">{active.id}</div>
            <h2 className="df-display text-2xl mt-1">
              {(active.customer.company?.trim() ?? '') || active.customer.name || 'Sans nom'}
            </h2>
            {active.customer.company?.trim() && active.customer.name.trim() ? (
              <div className="text-sm text-[var(--df-ink-3)] mt-0.5">{active.customer.name}</div>
            ) : null}
            <div className="mt-2">
              <StatusChip status={active.status} />
            </div>

            <dl className="mt-5 space-y-2">
              <Row label="Lignes" value={fmtInt.format(active.lines.length)} />
              <Row label="Pièces" value={fmtInt.format(active.qtyTotal)} />
              <Row label="Transport" value={active.transport} />
              <Row label="Revente" value={active.revente ? 'Oui' : 'Non'} />
              <Row label="Créé" value={fmtShortDate(active.createdAt)} />
              <Row label="Modifié" value={fmtShortDate(active.updatedAt)} />
            </dl>

            <div className="mt-5 pt-5 border-t border-[var(--df-border)]">
              <div className="df-caps">Total HT</div>
              <div className="df-display text-4xl mt-1 tabular-nums">
                {fmtEUR.format(active.totalHT)}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {!active.deletedAt && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      edit(active);
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--df-radius)] bg-[var(--df-accent)] text-[var(--df-accent-ink)] text-sm font-medium hover:bg-[var(--df-accent-2)]"
                  >
                    <FileText size={16} strokeWidth={1.8} /> Éditer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void resend(active);
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-sm font-medium hover:bg-[var(--df-bg-2)]"
                  >
                    <Send size={16} strokeWidth={1.8} /> Renvoyer le PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      duplicate(active);
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-sm font-medium hover:bg-[var(--df-bg-2)]"
                  >
                    <Copy size={16} strokeWidth={1.8} /> Dupliquer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      archiveEntry(active.id);
                      toast.message('Devis archivé');
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--df-radius)] bg-transparent text-[var(--df-ink-2)] text-sm font-medium hover:bg-[var(--df-surface-2)]"
                  >
                    <Archive size={16} strokeWidth={1.8} /> Archiver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeEntry(active.id);
                      toast.message('Devis supprimé (corbeille)');
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--df-radius)] bg-transparent text-[var(--df-danger)] text-sm font-medium hover:bg-[rgba(162,59,42,0.08)]"
                  >
                    <Trash2 size={16} strokeWidth={1.8} /> Mettre à la corbeille
                  </button>
                </>
              )}
              {active.deletedAt && (
                <button
                  type="button"
                  onClick={() => {
                    restoreEntry(active.id);
                    toast.success('Devis restauré');
                  }}
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-sm font-medium hover:bg-[var(--df-bg-2)]"
                >
                  <RotateCcw size={16} strokeWidth={1.8} /> Restaurer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] p-6 text-center text-sm text-[var(--df-ink-3)]">
            Sélectionnez un devis pour voir le détail.
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-xs text-[var(--df-ink-3)]">{label}</dt>
      <dd className="text-sm text-[var(--df-ink)] df-mono tabular-nums">{value}</dd>
    </div>
  );
}

function StatusChip({ status }: { status: 'draft' | 'sent' | 'archived' }) {
  if (status === 'draft') return <Chip>Brouillon</Chip>;
  if (status === 'sent') return <Chip variant="success">Envoyé</Chip>;
  return <Chip variant="warning">Archivé</Chip>;
}

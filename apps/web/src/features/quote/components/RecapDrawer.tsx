import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, FileText, Mail, MessageCircle, Pencil, UserPlus } from 'lucide-react';
import type { Customer, Transport } from '@df/shared';
import { Button } from '@/components/ui/Button';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { SyncIndicator } from '@/components/SyncIndicator';
import { eur, fmtInt } from '@/lib/format';
import type { QuoteTotals } from '../pricing';
import { TransportPicker } from './TransportPicker';
import { ReventeToggle } from './ReventeToggle';
import { CustomerInline } from './CustomerInline';

interface Props {
  quoteId: string;
  customer: Customer;
  onCustomerChange: (patch: Partial<Customer>) => void;
  dialCode: string;
  onDialCode: (code: string) => void;
  /** Champs client manquants à signaler après une tentative d'envoi. */
  missing?: { company?: boolean; name?: boolean; phone?: boolean; email?: boolean };
  totals: QuoteTotals;
  transport: Transport;
  revente: boolean;
  onTransport: (t: Transport) => void;
  onRevente: (v: boolean) => void;
  onGeneratePDF: () => void;
  onSendWhatsApp: () => void;
  onSendEmail: () => void;
  /** Largeur du panneau en px (réglable par l'utilisateur). */
  width?: number;
}

export function RecapDrawer({
  quoteId,
  customer,
  onCustomerChange,
  dialCode,
  onDialCode,
  missing,
  totals,
  transport,
  revente,
  onTransport,
  onRevente,
  onGeneratePDF,
  onSendWhatsApp,
  onSendEmail,
  width = 460,
}: Props) {
  const company = customer.company?.trim() ?? '';
  const contactName = customer.name.trim();
  const hasIdentity = company !== '' || contactName !== '';
  const customerTitle = company || contactName;
  const customerSubtitle = company && contactName ? contactName : '';
  const totalHTOnly = totals.subtotalHT + totals.transportHT;

  const anyMissing = missing ? Object.values(missing).some(Boolean) : false;
  const [editing, setEditing] = useState(false);
  // Une tentative d'envoi infructueuse rouvre le formulaire pour montrer le rouge.
  useEffect(() => {
    if (anyMissing) setEditing(true);
  }, [anyMissing]);

  return (
    <aside
      style={{ width }}
      className="df-glass shrink-0 h-screen border-l border-[var(--df-glass-border)] flex flex-col"
    >
      <div className="shrink-0 px-5 py-3.5 border-b border-[var(--df-border)] flex items-center justify-between gap-2">
        <div className="df-caps tabular-nums">{quoteId}</div>
        <SyncIndicator />
      </div>

      {/* Contexte — client + réglages par défaut du devis (zone défilable) */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="df-caps">Contexte</div>

        {/* Client — carte encadrée ; le bouton « Modifier » ouvre le formulaire. */}
        {editing ? (
          <div className="rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface)] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="df-caps">Client</div>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--df-ink-3)] hover:text-[var(--df-ink)] transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
              >
                <Check size={14} strokeWidth={1.8} aria-hidden />
                Terminé
              </button>
            </div>
            <CustomerInline
              customer={customer}
              onChange={onCustomerChange}
              dialCode={dialCode}
              onDialCode={onDialCode}
              missing={missing}
            />
          </div>
        ) : hasIdentity ? (
          <div className="rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="df-caps">Client</div>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                }}
                aria-label="Modifier le client"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--df-ink-3)] hover:text-[var(--df-ink)] transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
              >
                <Pencil size={13} strokeWidth={1.8} aria-hidden />
                Modifier
              </button>
            </div>
            <div className="df-display text-xl text-[var(--df-ink)] truncate mt-1.5">
              {customerTitle}
            </div>
            {customerSubtitle ? (
              <div className="text-sm text-[var(--df-ink-3)] truncate">{customerSubtitle}</div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
            }}
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-[var(--df-radius)] border-2 border-dashed border-[var(--df-accent)] bg-[var(--df-accent-soft)] text-sm font-medium text-[var(--df-accent)] hover:brightness-95 transition-[filter] duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
          >
            <UserPlus size={16} strokeWidth={1.8} aria-hidden />
            Lier un client
          </button>
        )}

        {/* Transport — défaut du devis, ajustable ligne par ligne */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="df-caps">Transport</div>
            <span className="text-[11px] text-[var(--df-ink-4)]">ajustable par ligne.</span>
          </div>
          <TransportPicker value={transport} onChange={onTransport} />
        </div>

        {/* Revente — défaut du devis (pilote l'exonération TGCA), ajustable par ligne */}
        <ReventeToggle value={revente} onChange={onRevente} />

        {/* Récap chiffré + actions — suivent le contexte dans le même flux continu */}
        <div className="pt-4 border-t border-[var(--df-border)] space-y-3">
          <div className="space-y-1.5">
            <Row
              label="Sous-total HT"
              value={<RollingNumber value={totals.subtotalHT} format={eur} />}
            />
            <Row
              label="Transport"
              value={
                totals.transportHT > 0 ? (
                  <RollingNumber value={totals.transportHT} format={eur} />
                ) : totals.qtyTotal > 0 ? (
                  'Gratuit'
                ) : (
                  '—'
                )
              }
              muted={totals.transportHT === 0}
            />
            <Row
              label="TGCA 4 %"
              value={
                totals.tgcaHT > 0 ? (
                  <RollingNumber value={totals.tgcaHT} format={eur} />
                ) : totals.qtyTotal > 0 ? (
                  'Exonéré — revente'
                ) : (
                  '—'
                )
              }
              muted={totals.tgcaHT === 0}
            />
          </div>

          {/* Total TTC — bulle accent : l'ancre chiffrée dominante du panneau. */}
          <div className="rounded-[var(--df-radius-lg)] bg-[var(--df-accent-soft)] px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--df-accent)]">
                Total TTC
              </div>
              <div className="text-xs font-medium tabular-nums text-[var(--df-accent)]">
                {fmtInt.format(totals.qtyTotal)} pièces
              </div>
            </div>
            <output
              role="status"
              aria-live="polite"
              className="df-display text-[2.5rem] leading-none mt-1.5 block tabular-nums text-[var(--df-accent)]"
            >
              <RollingNumber value={totals.totalHT} format={eur} />
            </output>
            <div className="mt-2.5 flex items-baseline justify-between gap-2 text-xs text-[var(--df-ink-3)]">
              <div className="df-mono tabular-nums">
                HT&nbsp;
                <RollingNumber value={totalHTOnly} format={eur} />
              </div>
              {totals.qtyTotal > 0 && (
                <div className="df-mono tabular-nums">
                  moy / pièce&nbsp;
                  <RollingNumber value={totals.totalHT / totals.qtyTotal} format={eur} />
                </div>
              )}
            </div>
          </div>

          {/* Actions terminales */}
          <div className="flex flex-col gap-2">
            <Button variant="primary" size="lg" onClick={onGeneratePDF}>
              <FileText size={18} strokeWidth={1.8} />
              Générer le PDF
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onSendWhatsApp}
                disabled={!hasIdentity}
                title={hasIdentity ? undefined : 'Liez un client pour activer l’envoi'}
              >
                <MessageCircle size={16} strokeWidth={1.8} />
                WhatsApp
              </Button>
              <Button
                onClick={onSendEmail}
                disabled={!hasIdentity}
                title={hasIdentity ? undefined : 'Liez un client pour activer l’envoi'}
              >
                <Mail size={16} strokeWidth={1.8} />
                Email
              </Button>
            </div>
            {!hasIdentity && (
              <p className="text-[11px] text-[var(--df-ink-4)] text-center">
                Liez un client pour envoyer le devis.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) {
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

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, FileText, Mail, MessageCircle, Pencil, UserPlus } from 'lucide-react';
import type { Customer, Transport } from '@df/shared';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { SyncIndicator } from '@/components/SyncIndicator';
import { eur, fmtCoef, fmtInt } from '@/lib/format';
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
      <div className="px-6 py-4 border-b border-[var(--df-border)] flex items-center justify-between gap-2">
        <div className="df-caps tabular-nums">{quoteId}</div>
        <SyncIndicator />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Client */}
        <section className="space-y-2">
          <div className="df-caps">Client</div>
          {editing ? (
            <div className="space-y-2">
              <CustomerInline
                customer={customer}
                onChange={onCustomerChange}
                dialCode={dialCode}
                onDialCode={onDialCode}
                missing={missing}
              />
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
          ) : hasIdentity ? (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="df-display text-2xl text-[var(--df-ink)] truncate">
                  {customerTitle}
                </div>
                {customerSubtitle ? (
                  <div className="text-sm text-[var(--df-ink-3)] truncate">{customerSubtitle}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                }}
                aria-label="Modifier le client"
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[var(--df-radius)] text-xs font-medium text-[var(--df-ink-3)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)] transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
              >
                <Pencil size={14} strokeWidth={1.8} aria-hidden />
                Modifier
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
              }}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-[var(--df-radius)] border-2 border-dashed border-[var(--df-accent)] bg-[var(--df-accent-soft)] text-sm font-medium text-[var(--df-accent)] hover:brightness-95 transition-[filter] duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
            >
              <UserPlus size={16} strokeWidth={1.8} aria-hidden />
              Lier un client
            </button>
          )}
        </section>

        {/* Transport — défaut du devis, appliqué à toutes les lignes */}
        <section className="space-y-2">
          <div className="df-caps">Transport</div>
          <TransportPicker value={transport} onChange={onTransport} />
          <p className="text-[11px] text-[var(--df-ink-3)]">
            Appliqué à toutes les lignes · ajustable ligne par ligne.
          </p>
        </section>

        {/* TGCA / Revente — défaut du devis, appliqué à toutes les lignes */}
        <section className="space-y-1.5">
          <ReventeToggle value={revente} onChange={onRevente} />
          <p className="text-[11px] text-[var(--df-ink-3)]">
            Appliqué à toutes les lignes · ajustable ligne par ligne.
          </p>
        </section>

        {/* Totaux */}
        <section className="space-y-1.5">
          <Row
            label="Sous-total HT"
            value={<RollingNumber value={totals.subtotalHT} format={eur} />}
          />
          <Row
            label="Transport"
            value={
              totals.transportHT > 0 ? (
                <RollingNumber value={totals.transportHT} format={eur} />
              ) : (
                'Gratuit'
              )
            }
            muted={totals.transportHT === 0}
          />
          <Row
            label="TGCA 4 %"
            value={
              totals.tgcaHT > 0 ? (
                <RollingNumber value={totals.tgcaHT} format={eur} />
              ) : (
                'Exonéré — revente'
              )
            }
            muted={totals.tgcaHT === 0}
          />
          <div className="pt-3 mt-3 border-t border-[var(--df-border)]">
            <div className="flex items-baseline justify-between">
              <div className="df-caps">Total TTC</div>
              <Chip variant="accent">
                {fmtInt.format(totals.qtyTotal)} pièces · ×{fmtCoef.format(totals.coef)}
              </Chip>
            </div>
            <output
              role="status"
              aria-live="polite"
              className="df-display text-5xl mt-1 block tabular-nums text-[var(--df-accent)]"
            >
              <RollingNumber value={totals.totalHT} format={eur} />
            </output>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="df-caps">Total HT</div>
              <div className="df-display text-2xl tabular-nums text-[var(--df-ink-2)]">
                <RollingNumber value={totalHTOnly} format={eur} />
              </div>
            </div>
            {totals.qtyTotal > 0 && (
              <div className="mt-2 flex items-baseline justify-between text-xs text-[var(--df-ink-3)]">
                <div>Prix moyen / pièce</div>
                <div className="df-mono tabular-nums">
                  HT&nbsp;
                  <RollingNumber value={totalHTOnly / totals.qtyTotal} format={eur} />
                  {' · '}TTC&nbsp;
                  <RollingNumber value={totals.totalHT / totals.qtyTotal} format={eur} />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-[var(--df-border)] flex flex-col gap-2">
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

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Copy,
  Download,
  FileText as FileTextIcon,
  History,
  Image as ImageIcon,
  MoreHorizontal,
  Package,
  PencilLine,
  Percent,
  Plus,
  Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuoteStore, useQuoteTotals, attachIdbStorage } from '@/features/quote/quoteStore';
import { useHistoryStore, attachHistoryIdb } from '@/features/quote/historyStore';
import { useCatalogBoot } from '@/features/catalog/boot';
import { nextQuoteId } from '@/features/quote/quoteId';
import { lineQty } from '@/features/quote/pricing';
import { buildQuoteMessage, whatsappUrl, mailtoUrl, DEFAULT_DIAL } from '@/features/quote/share';
import { LineRow, PricingGrid, RecapDrawer } from '@/features/quote/components';
import { SegToggle } from '@/components/ui/SegToggle';
import { Logo } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fmtShortDate } from '@/lib/format';
import type { Customer } from '@df/shared';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

attachIdbStorage();
attachHistoryIdb();

const VIEW_OPTIONS = [
  {
    value: 'devis' as const,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <FileTextIcon size={14} strokeWidth={1.8} aria-hidden />
        <span className="sr-only xl:not-sr-only">Devis</span>
      </span>
    ),
  },
  {
    value: 'grille' as const,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Table2 size={14} strokeWidth={1.8} aria-hidden />
        <span className="sr-only xl:not-sr-only">Grille</span>
      </span>
    ),
  },
];

export default function TabletPage() {
  useCatalogBoot();
  const [view, setView] = useState<'devis' | 'grille'>('devis');
  const [missingClient, setMissingClient] = useState<{
    company?: boolean;
    name?: boolean;
    phone?: boolean;
    email?: boolean;
  }>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const navigate = useNavigate();

  const DRAWER_MIN = 360;
  const DRAWER_MAX = 760;
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('df:drawer-width'));
      if (Number.isFinite(saved) && saved >= DRAWER_MIN) {
        return Math.min(saved, DRAWER_MAX);
      }
    } catch {
      /* ignore */
    }
    return 460;
  });
  useEffect(() => {
    try {
      localStorage.setItem('df:drawer-width', String(drawerWidth));
    } catch {
      /* ignore */
    }
  }, [drawerWidth]);

  // Indicatif pays pour l'envoi WhatsApp — sticky entre devis (St-Martin par défaut).
  const [dialCode, setDialCode] = useState<string>(() => {
    try {
      return localStorage.getItem('df:dial-code') ?? DEFAULT_DIAL;
    } catch {
      return DEFAULT_DIAL;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('df:dial-code', dialCode);
    } catch {
      /* ignore */
    }
  }, [dialCode]);

  function handleResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    const onMove = (ev: PointerEvent) => {
      const w = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, window.innerWidth - ev.clientX));
      setDrawerWidth(w);
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  const id = useQuoteStore((s) => s.id);
  const customer = useQuoteStore((s) => s.customer);
  const lines = useQuoteStore((s) => s.lines);
  const transport = useQuoteStore((s) => s.transport);
  const revente = useQuoteStore((s) => s.revente);
  const updatedAt = useQuoteStore((s) => s.updatedAt);

  const addLine = useQuoteStore((s) => s.addLine);
  const addCustomLine = useQuoteStore((s) => s.addCustomLine);
  const removeLine = useQuoteStore((s) => s.removeLine);
  const updateLine = useQuoteStore((s) => s.updateLine);
  const setSizes = useQuoteStore((s) => s.setSizes);
  const setFlockMode = useQuoteStore((s) => s.setFlockMode);
  const setLinked = useQuoteStore((s) => s.setLinked);
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
      if (qty === 0 && customer.name.trim() === '' && (customer.company ?? '').trim() === '')
        return;
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

  function handleCustomerChange(patch: Partial<Customer>) {
    setCustomer(patch);
    setMissingClient((m) => {
      const next = { ...m };
      // Société et nom satisfont la même exigence (au moins l'un des deux) :
      // saisir l'un efface le signalement rouge des deux.
      if ('company' in patch || 'name' in patch) {
        delete next.company;
        delete next.name;
      }
      if ('phone' in patch) delete next.phone;
      if ('email' in patch) delete next.email;
      return next;
    });
  }

  function validateClient(): boolean {
    const company = (customer.company ?? '').trim();
    const name = customer.name.trim();
    const phone = (customer.phone ?? '').trim();
    const email = (customer.email ?? '').trim();
    const identityMissing = company === '' && name === '';
    const miss = {
      company: identityMissing,
      name: identityMissing,
      phone: phone === '',
      email: email === '' || !EMAIL_RE.test(email),
    };
    if (identityMissing || miss.phone || miss.email) {
      setMissingClient(miss);
      const labels: string[] = [];
      if (identityMissing) labels.push('société ou nom');
      if (miss.phone) labels.push('téléphone');
      if (miss.email) labels.push(email !== '' ? 'email valide' : 'email');
      toast.error('Infos client obligatoires', {
        description: `À renseigner avant l'envoi : ${labels.join(', ')}.`,
      });
      return false;
    }
    setMissingClient({});
    return true;
  }

  // Génère + télécharge le PDF, puis passe le devis en "Envoyé". Annule un
  // enregistrement brouillon en attente (debounce) qui écraserait le statut.
  async function downloadPdfAndMarkSent(): Promise<void> {
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
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    useHistoryStore.getState().upsert({
      id,
      status: 'sent',
      customer,
      transport,
      revente,
      lines,
      totalHT: totals.totalHT,
      qtyTotal: totals.qtyTotal,
      createdAt,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }

  function handleGenerate() {
    if (!validateClient()) return;
    void (async () => {
      try {
        toast.loading('Génération du PDF…', { id: 'pdf' });
        await downloadPdfAndMarkSent();
        toast.success('PDF généré', { id: 'pdf', description: `${id}.pdf téléchargé` });
      } catch (err) {
        console.error('PDF generation failed', err);
        toast.error('Échec génération PDF', { id: 'pdf' });
      }
    })();
  }

  function handleSendWhatsApp() {
    if (!validateClient()) return;
    const createdAt = useQuoteStore.getState().createdAt;
    const { body } = buildQuoteMessage({
      id,
      customer,
      lines: lines.filter((l) => l.linked),
      transport,
      revente,
      totals,
      createdAt,
    });
    // Ouvre WhatsApp dans le geste de clic (avant tout await) pour ne pas être
    // bloqué par le bloqueur de pop-up.
    window.open(whatsappUrl(customer.phone ?? '', body, dialCode), '_blank', 'noopener,noreferrer');
    void (async () => {
      try {
        toast.loading('Préparation du PDF à joindre…', { id: 'pdf' });
        await downloadPdfAndMarkSent();
        toast.success('WhatsApp ouvert', {
          id: 'pdf',
          description: `${id}.pdf téléchargé — à joindre au message.`,
        });
      } catch (err) {
        console.error('WhatsApp prepare failed', err);
        toast.error('Échec préparation du PDF', { id: 'pdf' });
      }
    })();
  }

  function handleSendEmail() {
    if (!validateClient()) return;
    const createdAt = useQuoteStore.getState().createdAt;
    const { subject, body } = buildQuoteMessage({
      id,
      customer,
      lines: lines.filter((l) => l.linked),
      transport,
      revente,
      totals,
      createdAt,
    });
    window.location.href = mailtoUrl(customer.email ?? '', subject, body);
    void (async () => {
      try {
        toast.loading('Préparation du PDF à joindre…', { id: 'pdf' });
        await downloadPdfAndMarkSent();
        toast.success('Email préparé', {
          id: 'pdf',
          description: `${id}.pdf téléchargé — à joindre au mail.`,
        });
      } catch (err) {
        console.error('Email prepare failed', err);
        toast.error('Échec préparation du PDF', { id: 'pdf' });
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

  // Forke le devis courant sous un nouvel ID : l'original reste en historique
  // (auto-sauvegardé), l'édition continue sur la copie.
  function handleDuplicate() {
    const newId = nextQuoteId();
    const now = new Date().toISOString();
    useQuoteStore.setState({ id: newId, status: 'draft', createdAt: now, updatedAt: now });
    toast.success('Devis dupliqué', { description: newId });
  }

  const activeLine = lines.find((l) => l.id === useQuoteStore.getState().activeLineId) ?? lines[0];

  return (
    <div className="flex min-h-screen bg-[var(--df-bg)]">
      <main className="flex-1 flex flex-col min-w-0">
        <header className="df-glass h-[var(--df-titlebar-height)] shrink-0 px-4 border-b border-[var(--df-glass-border)] flex items-center gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo className="w-7 h-7 shrink-0 text-[var(--df-accent)]" />
            <h1 className="df-display text-lg text-[var(--df-ink)] truncate">Nouveau devis</h1>
            <span className="df-caps shrink-0 hidden xl:inline">OLDA · SXM</span>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] whitespace-nowrap tabular-nums">
            <span className="df-mono text-xs text-[var(--df-ink-2)]">{id}</span>
            <span className="hidden xl:inline text-[var(--df-ink-4)]">·</span>
            <span className="hidden xl:inline text-xs text-[var(--df-ink-3)]">
              {fmtShortDate(updatedAt)}
            </span>
          </span>

          <div className="flex-1" />

          <SegToggle
            value={view}
            onChange={setView}
            options={VIEW_OPTIONS}
            ariaLabel="Mode d'affichage"
          />

          <button
            type="button"
            onClick={() => {
              navigate('/admin/quotes');
            }}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-sm font-medium text-[var(--df-ink-2)] hover:bg-[var(--df-bg-2)] hover:text-[var(--df-ink)] transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
          >
            <History size={15} strokeWidth={1.8} aria-hidden />
            <span className="hidden xl:inline">Historique</span>
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setMenuOpen((o) => !o);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Plus d'actions"
              className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-[var(--df-ink-2)] hover:bg-[var(--df-bg-2)] hover:text-[var(--df-ink)] transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
            >
              <MoreHorizontal size={18} strokeWidth={1.8} aria-hidden />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1.5 z-50 w-60 p-1 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface)] shadow-[var(--df-shadow-3)]"
                >
                  <MenuItem
                    icon={Copy}
                    onClick={() => {
                      handleDuplicate();
                      setMenuOpen(false);
                    }}
                  >
                    Dupliquer ce devis
                  </MenuItem>
                  <MenuItem
                    icon={Download}
                    onClick={() => {
                      handleExportJSON();
                      setMenuOpen(false);
                    }}
                  >
                    Exporter JSON
                  </MenuItem>
                  <MenuItem icon={History} disabled>
                    Voir l’historique de la ligne
                  </MenuItem>
                </div>
              </>
            )}
          </div>
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
                  onRemove={() => {
                    removeLine(line.id);
                  }}
                />
              ))}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen((o) => !o);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={addOpen}
                  className="w-full flex items-center justify-center gap-2 h-14 rounded-[var(--df-radius-lg)] border-2 border-dashed border-[var(--df-border-strong)] text-[var(--df-ink-2)] text-sm font-medium hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)] transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]"
                >
                  <Plus size={18} strokeWidth={1.8} aria-hidden />
                  Ajouter
                  <ChevronDown size={16} strokeWidth={1.8} aria-hidden />
                </button>
                {addOpen && (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      onClick={() => {
                        setAddOpen(false);
                      }}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div
                      role="menu"
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 p-1 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface)] shadow-[var(--df-shadow-3)]"
                    >
                      <MenuItem
                        icon={Package}
                        onClick={() => {
                          addLine();
                          setAddOpen(false);
                        }}
                      >
                        Référence catalogue
                      </MenuItem>
                      <MenuItem
                        icon={PencilLine}
                        onClick={() => {
                          addCustomLine();
                          setAddOpen(false);
                        }}
                      >
                        Ligne libre
                      </MenuItem>
                      <MenuItem icon={ImageIcon} disabled>
                        Frais de maquette
                      </MenuItem>
                      <MenuItem icon={Percent} disabled>
                        Remise
                      </MenuItem>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner le panneau récapitulatif"
        onPointerDown={handleResizeStart}
        className="w-1.5 shrink-0 cursor-col-resize bg-[var(--df-border)] hover:bg-[var(--df-accent)] active:bg-[var(--df-accent)] transition-colors"
      />

      <RecapDrawer
        quoteId={id}
        customer={customer}
        onCustomerChange={handleCustomerChange}
        dialCode={dialCode}
        onDialCode={setDialCode}
        missing={missingClient}
        totals={totals}
        transport={transport}
        revente={revente}
        onTransport={setTransport}
        onRevente={setRevente}
        onGeneratePDF={handleGenerate}
        onSendWhatsApp={handleSendWhatsApp}
        onSendEmail={handleSendEmail}
        width={drawerWidth}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  disabled,
}: {
  icon: typeof Plus;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Bientôt disponible' : undefined}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 h-10 rounded-[calc(var(--df-radius)-2px)] text-sm text-left transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]',
        disabled
          ? 'text-[var(--df-ink-4)] cursor-not-allowed'
          : 'text-[var(--df-ink-2)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)]',
      )}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden />
      <span className="flex-1">{children}</span>
      {disabled && <span className="df-caps text-[var(--df-ink-4)]">Bientôt</span>}
    </button>
  );
}

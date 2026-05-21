import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Link2, Link2Off, Trash2, Truck } from 'lucide-react';
import { SIZE_KEYS } from '@df/shared';
import type {
  CatalogProduct,
  CatalogTextileColor,
  ProductFamily,
  QuoteLine,
  Sizes,
  SizeKey,
  FlockMode,
  Transport,
} from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { eur } from '@/lib/format';
import { cn } from '@/lib/cn';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { lineQty, unitPriceBreakdown, lineSubtotalHT } from '../pricing';
import { QtyGrid } from './QtyGrid';

interface Props {
  index: number;
  line: QuoteLine;
  /** Quote-level transport default — used when the line has no override. */
  transport: Transport;
  /** Quote-level revente default — used when the line has no override. */
  revente: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<Omit<QuoteLine, 'id'>>) => void;
  onSizes: (sizes: Sizes) => void;
  onFlockMode: (m: FlockMode) => void;
  onLinked: (b: boolean) => void;
  onRemove: () => void;
}

const FAMILY_LABEL: Record<ProductFamily, string> = {
  unisexe: 'Homme',
  femme: 'Femme',
  enfant: 'Enfant',
};

const FAMILY_ORDER: ProductFamily[] = ['unisexe', 'femme', 'enfant'];

export function LineRow({
  index,
  line,
  transport,
  revente,
  canRemove,
  onChange,
  onSizes,
  onFlockMode,
  onLinked,
  onRemove,
}: Props) {
  const { products, productByRef, placements, textileColors, transports, tgcaRate, version } =
    useCatalog();
  const isCustom = line.custom !== undefined;
  const product = isCustom ? undefined : productByRef[line.productRef];
  const displayRef = isCustom ? 'Libre' : (product?.ref ?? '—');
  const displayName = isCustom
    ? (line.custom?.name ?? 'Produit libre')
    : (product?.name ?? 'Produit ?');
  const qty = lineQty(line.sizes);
  const isLinked = line.linked;
  const effectiveTransport: Transport = line.transport ?? transport;
  const effectiveRevente = line.revente ?? revente;

  const externalCustomPrice = line.custom?.priceAchat ?? 0;
  const [customPriceText, setCustomPriceText] = useState<string>(() =>
    externalCustomPrice === 0 ? '' : String(externalCustomPrice).replace('.', ','),
  );
  useEffect(() => {
    const parsed = Number(customPriceText.replace(',', '.'));
    const localNum = customPriceText.trim() === '' ? 0 : Number.isFinite(parsed) ? parsed : 0;
    if (Math.abs(localNum - externalCustomPrice) > 1e-6) {
      setCustomPriceText(
        externalCustomPrice === 0 ? '' : String(externalCustomPrice).replace('.', ','),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCustomPrice]);

  const transportPerPiece = useMemo(() => {
    return transports.find((t) => t.id === effectiveTransport)?.surcharge ?? 0;
  }, [effectiveTransport, transports]);

  // Chaque ligne est tarifée sur SA propre quantité : le palier (coef + zones)
  // ne dépend que de cette ligne, donc éditer une autre ligne ne déplace jamais
  // son prix. Tant qu'aucune quantité n'est saisie, le prix n'a pas de sens
  // (coefFor(0) renvoie la marge la plus forte) : on n'affiche donc rien.
  const hasPricing = qty > 0;

  const breakdown = useMemo(() => {
    if (!hasPricing) return null;
    try {
      return unitPriceBreakdown({
        productRef: line.productRef,
        placementId: line.placementId,
        qty,
        code: line.code,
        transportPerPiece,
        priceAchatOverride: line.custom?.priceAchat,
      });
    } catch {
      return null;
    }
    // version forces a recompute when the catalogue changes (read via getCatalog)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasPricing,
    line.productRef,
    line.placementId,
    qty,
    line.code,
    transportPerPiece,
    line.custom?.priceAchat,
    version,
  ]);

  const subtotal = useMemo(() => {
    if (!hasPricing) return 0;
    try {
      return lineSubtotalHT(line);
    } catch {
      return 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPricing, line, version]);

  // Prix unitaire (1 t-shirt, transport/pièce inclus → bouge avec Chrono) et
  // prix total de la ligne, chacun en HT et TTC (TGCA 4 % sauf exonération).
  const money = useMemo(() => {
    const tgcaFactor = effectiveRevente ? 1 : 1 + tgcaRate;
    const unitHT = breakdown?.unitWithTransportHT ?? 0;
    const unitTTC = unitHT * tgcaFactor;
    const ht = subtotal + transportPerPiece * qty;
    const ttc = ht * tgcaFactor;
    return { unitHT, unitTTC, ht, ttc };
  }, [breakdown, subtotal, transportPerPiece, qty, effectiveRevente, tgcaRate]);

  const groupedProducts = useMemo(() => {
    const byFamily = new Map<ProductFamily, CatalogProduct[]>();
    for (const f of FAMILY_ORDER) byFamily.set(f, []);
    for (const p of products) byFamily.get(p.family)?.push(p);
    for (const list of byFamily.values())
      list.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    return byFamily;
  }, [products]);

  // Tailles proposées par la référence (undefined ⇒ toutes). Ordre canonique.
  const availableSizes = useMemo<SizeKey[] | undefined>(() => {
    const s = product?.sizes;
    return s && s.length > 0 ? SIZE_KEYS.filter((k) => s.includes(k)) : undefined;
  }, [product]);
  const availableSizesKey = availableSizes ? availableSizes.join(',') : 'all';

  // Quand la réf change pour une qui n'offre pas certaines tailles, on remet à
  // zéro les quantités masquées : sinon un reliquat invisible gonflerait le prix.
  useEffect(() => {
    if (!availableSizes) return;
    let changed = false;
    const next: Sizes = { ...line.sizes };
    for (const k of SIZE_KEYS) {
      if (!availableSizes.includes(k) && next[k] !== 0) {
        next[k] = 0;
        changed = true;
      }
    }
    if (changed) onSizes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSizesKey]);

  return (
    <section
      aria-label={`Ligne ${String(index + 1)}`}
      className={cn(
        'rounded-[var(--df-radius-lg)] border bg-[var(--df-surface)] transition-colors',
        isLinked
          ? 'border-[var(--df-accent)] shadow-[var(--df-shadow-1)]'
          : 'border-[var(--df-border)] opacity-90',
      )}
    >
      {/* Header — référence en titre + méta discrète (transport, TGCA) */}
      <div className="px-5 pt-4 pb-3 flex flex-col gap-2 border-b border-[var(--df-border)]">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-3 flex-1 min-w-0">
            <span className="df-mono text-sm text-[var(--df-ink-3)] shrink-0">#{index + 1}</span>
            <span className="df-mono text-base text-[var(--df-ink-3)] shrink-0">{displayRef}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={line.code}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ code: Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 10 });
              }}
              aria-label="Code multi-couleurs"
              className="df-mono text-base text-[var(--df-ink-3)] shrink-0 bg-transparent border border-[var(--df-border)] rounded px-2 py-0.5 w-14 text-center tabular-nums focus:outline-none focus:border-[var(--df-accent)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <h3 className="df-display text-xl leading-tight text-[var(--df-ink)]">{displayName}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              onLinked(!isLinked);
            }}
            aria-pressed={isLinked}
            aria-label={isLinked ? 'Délier du devis' : 'Lier au devis'}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-10 rounded-[var(--df-radius)] text-xs font-medium transition-colors',
              isLinked
                ? 'bg-[var(--df-accent-soft)] text-[var(--df-accent)] border border-[var(--df-accent)]'
                : 'bg-[var(--df-surface-2)] text-[var(--df-ink-3)] border border-[var(--df-border)] hover:text-[var(--df-ink)]',
            )}
          >
            {isLinked ? (
              <Link2 size={14} strokeWidth={2} aria-hidden />
            ) : (
              <Link2Off size={14} strokeWidth={2} aria-hidden />
            )}
            {isLinked ? 'Liée' : 'Délié'}
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Supprimer la ligne ${String(index + 1)}`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-[var(--df-radius)] text-[var(--df-ink-3)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-danger)]"
            >
              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
            </button>
          )}
        </div>

        {/* Méta discrète de la ligne — surcharge le réglage global du devis */}
        <div className="flex items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5 text-[var(--df-ink-3)]">
            <Truck size={13} strokeWidth={1.8} aria-hidden className="text-[var(--df-ink-4)]" />
            <span className="sr-only">Transport</span>
            <span className="relative inline-flex items-center">
              <select
                value={effectiveTransport}
                onChange={(e) => {
                  onChange({ transport: e.target.value as Transport });
                }}
                aria-label={`Transport ligne ${String(index + 1)}`}
                className="appearance-none bg-transparent pr-4 font-medium text-[var(--df-ink-2)] hover:text-[var(--df-ink)] cursor-pointer focus:outline-none focus:text-[var(--df-accent)]"
              >
                {transports.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.surcharge > 0 ? ` +${eur(t.surcharge)}/pc` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                strokeWidth={1.8}
                aria-hidden
                className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--df-ink-4)]"
              />
            </span>
          </label>

          <span className="text-[var(--df-ink-4)]" aria-hidden>
            ·
          </span>

          <button
            type="button"
            onClick={() => {
              onChange({ revente: !effectiveRevente });
            }}
            aria-pressed={effectiveRevente}
            aria-label={`TGCA ligne ${String(index + 1)} — ${effectiveRevente ? 'exonérée' : 'appliquée'}`}
            className="inline-flex items-center gap-1.5 font-medium text-[var(--df-ink-3)] hover:text-[var(--df-ink)] transition-colors"
          >
            <span className="df-caps">TGCA {Math.round(tgcaRate * 100)}%</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-[var(--df-radius-sm)] text-[11px] leading-none',
                effectiveRevente
                  ? 'bg-[var(--df-accent-soft)] text-[var(--df-accent)]'
                  : 'bg-[var(--df-surface-2)] text-[var(--df-ink-2)]',
              )}
            >
              {effectiveRevente ? 'Exonérée' : 'Appliquée'}
            </span>
          </button>
        </div>
      </div>

      {/* Row 1: dropdowns inline */}
      <div className="px-5 py-4 grid grid-cols-12 gap-3 items-end">
        {isCustom ? (
          <Field label="Produit libre (nom + prix achat)" className="col-span-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={line.custom?.name ?? ''}
                onChange={(e) => {
                  onChange({
                    custom: {
                      name: e.target.value,
                      priceAchat: line.custom?.priceAchat ?? 0,
                    },
                  });
                }}
                placeholder="Nom du t-shirt"
                aria-label="Nom du produit libre"
                className="df-input h-12 flex-1 min-w-0"
              />
              <div className="relative w-28 shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  value={customPriceText}
                  onChange={(e) => {
                    let cleaned = e.target.value.replace(/[^\d.,]/g, '');
                    const firstSep = cleaned.search(/[.,]/);
                    if (firstSep !== -1) {
                      cleaned =
                        cleaned.slice(0, firstSep + 1) +
                        cleaned.slice(firstSep + 1).replace(/[.,]/g, '');
                    }
                    setCustomPriceText(cleaned);
                    const parsed = Number(cleaned.replace(',', '.'));
                    const n = cleaned === '' || !Number.isFinite(parsed) ? 0 : Math.max(0, parsed);
                    onChange({
                      custom: {
                        name: line.custom?.name ?? '',
                        priceAchat: n,
                      },
                    });
                  }}
                  placeholder="0,00"
                  aria-label="Prix achat (€ HT)"
                  className="df-input h-12 pr-7 text-right tabular-nums"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[var(--df-ink-3)] pointer-events-none">
                  €
                </span>
              </div>
            </div>
          </Field>
        ) : (
          <Field label="Produit" className="col-span-3">
            <SelectInput
              value={line.productRef}
              onChange={(v) => {
                onChange({ productRef: v });
              }}
              aria-label="Produit textile"
            >
              {FAMILY_ORDER.map((family) => {
                const items = groupedProducts.get(family) ?? [];
                if (items.length === 0) return null;
                return (
                  <optgroup key={family} label={FAMILY_LABEL[family]}>
                    {items.map((p) => (
                      <option key={p.ref} value={p.ref}>
                        {p.ref} — {p.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </SelectInput>
          </Field>
        )}

        <Field label="Coloris textile" className="col-span-3">
          <TextileColorPicker
            options={textileColors}
            availableIds={product?.colorIds ?? []}
            bestIds={product?.bestColorIds ?? []}
            value={line.textileColorId}
            onChange={(v) => {
              onChange({ textileColorId: v });
            }}
          />
        </Field>

        <Field label="Placement DTF" className="col-span-3">
          <SelectInput
            value={line.placementId}
            onChange={(v) => {
              onChange({ placementId: v });
            }}
            aria-label="Placement DTF"
          >
            {placements.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Flocage" className="col-span-3">
          <FlockSelect
            mode={line.flockMode}
            color={line.flockColorId}
            onMode={onFlockMode}
            onColor={(c) => {
              onChange({ flockColorId: c });
            }}
          />
        </Field>
      </div>

      {/* Note libre sous la référence */}
      <div className="px-5 pb-4">
        <label className="flex flex-col gap-1.5">
          <span className="df-caps">Note</span>
          <input
            type="text"
            value={line.note ?? ''}
            onChange={(e) => {
              onChange({ note: e.target.value });
            }}
            placeholder="Note libre (ex. logo fourni, BAT à valider, coloris spécifique…)"
            aria-label={`Note ligne ${String(index + 1)}`}
            className="df-input h-11"
          />
        </label>
      </div>

      {/* Grille tailles + prix dérivé (le prix n'apparaît qu'une fois saisie) */}
      <div className="px-5 pb-5 pt-4 border-t border-[var(--df-border)] flex flex-col gap-4">
        <QtyGrid sizes={line.sizes} onChange={onSizes} availableSizes={availableSizes} />

        {qty > 0 && (
          <div className="flex flex-col gap-2 px-4 py-3 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)]">
            {/* Prix unitaire (1 t-shirt) */}
            <div className="flex items-baseline justify-between gap-4">
              <span className="df-caps shrink-0">Prix / pièce</span>
              <div className="flex items-baseline gap-5">
                <span className="df-mono text-base tabular-nums text-[var(--df-ink)]">
                  <span className="df-caps mr-1">HT</span>
                  <RollingNumber value={money.unitHT} format={eur} />
                </span>
                <span className="df-mono text-base tabular-nums text-[var(--df-accent)]">
                  <span className="df-caps mr-1 text-[var(--df-accent)]">TTC</span>
                  <RollingNumber value={money.unitTTC} format={eur} />
                </span>
              </div>
            </div>

            {/* Prix total de la ligne */}
            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--df-border)] pt-2">
              <span className="df-caps shrink-0">Total ligne</span>
              <div className="flex items-baseline gap-5">
                <span className="df-display text-2xl tabular-nums text-[var(--df-ink)]">
                  <span className="df-caps mr-1">HT</span>
                  <RollingNumber value={money.ht} format={eur} />
                </span>
                <span className="df-display text-2xl tabular-nums text-[var(--df-accent)]">
                  <span className="df-caps mr-1 text-[var(--df-accent)]">TTC</span>
                  <RollingNumber value={money.ttc} format={eur} />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="df-caps">{label}</span>
      {children}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  children,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'children'>) {
  return (
    <div className="relative">
      <select
        className="df-input appearance-none pr-9 cursor-pointer h-12"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)] pointer-events-none"
        size={16}
        strokeWidth={1.8}
        aria-hidden
      />
    </div>
  );
}

/**
 * Sélecteur de coloris textile par référence : pastilles best-sellers d'abord,
 * une flèche « Plus de couleurs » déplie les autres coloris disponibles de la réf.
 * `availableIds` vide ⇒ tous les coloris ; `bestIds` vide ⇒ repli sur le flag global.
 */
function TextileColorPicker({
  options,
  availableIds,
  bestIds,
  value,
  onChange,
}: {
  options: readonly CatalogTextileColor[];
  availableIds: readonly string[];
  bestIds: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Ferme au clic en dehors du sélecteur (ou via Échap). Remplace l'ancien voile
  // plein écran qui, selon le contexte d'empilement, pouvait passer au-dessus de
  // la liste et intercepter les clics destinés aux pastilles de couleur.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const byId = useMemo(() => {
    const m = new Map<string, CatalogTextileColor>();
    for (const c of options) m.set(c.id, c);
    return m;
  }, [options]);

  // Coloris disponibles pour la réf (vide ⇒ tous), dans l'ordre du catalogue.
  const available = useMemo(() => {
    if (availableIds.length === 0) return [...options];
    const set = new Set(availableIds);
    return options.filter((c) => set.has(c.id));
  }, [options, availableIds]);

  // Best-sellers : ordre explicite de la réf, sinon repli sur le flag global `best`.
  const best = useMemo(() => {
    const avail = new Set(available.map((c) => c.id));
    if (bestIds.length > 0) {
      return bestIds
        .map((id) => byId.get(id))
        .filter((c): c is CatalogTextileColor => !!c && avail.has(c.id));
    }
    const flagged = available.filter((c) => c.best);
    return flagged.length > 0 ? flagged : available;
  }, [available, bestIds, byId]);

  const others = useMemo(() => {
    const bestSet = new Set(best.map((c) => c.id));
    return available.filter((c) => !bestSet.has(c.id));
  }, [available, best]);

  const current = byId.get(value);

  // Si la couleur choisie n'est pas un best-seller, on déplie pour la rendre visible.
  useEffect(() => {
    if (open && others.some((c) => c.id === value)) setExpanded(true);
  }, [open, others, value]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Coloris textile"
        className="df-input appearance-none pl-10 pr-9 h-12 w-full cursor-pointer text-left flex items-center"
      >
        <span className="truncate">{current?.name ?? 'Choisir…'}</span>
      </button>
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full pointer-events-none border border-[rgba(0,0,0,0.1)]"
        style={{ background: current?.hex ?? '#a4adb6' }}
        aria-hidden
      />
      <ChevronDown
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)] pointer-events-none transition-transform',
          open && 'rotate-180',
        )}
        size={16}
        strokeWidth={1.8}
        aria-hidden
      />

      {open && (
        <div
          role="listbox"
          aria-label="Coloris disponibles"
          className="absolute left-0 top-full mt-1.5 z-50 w-[min(20rem,80vw)] p-2 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface)] shadow-[var(--df-shadow-3)]"
        >
          <span className="df-caps block px-1 pb-1.5">Best-sellers</span>
          <div className="grid grid-cols-2 gap-1.5">
            {best.map((c) => (
              <SwatchOption
                key={c.id}
                color={c}
                selected={c.id === value}
                onPick={() => {
                  pick(c.id);
                }}
              />
            ))}
          </div>

          {others.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setExpanded((e) => !e);
                }}
                aria-expanded={expanded}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-[var(--df-radius-sm)] text-xs font-medium text-[var(--df-ink-2)] hover:bg-[var(--df-surface-2)]"
              >
                <ChevronDown
                  size={14}
                  strokeWidth={1.8}
                  className={cn('transition-transform', expanded && 'rotate-180')}
                  aria-hidden
                />
                {expanded ? 'Moins de couleurs' : `Plus de couleurs (${String(others.length)})`}
              </button>
              {expanded && (
                <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                  {others.map((c) => (
                    <SwatchOption
                      key={c.id}
                      color={c}
                      selected={c.id === value}
                      onPick={() => {
                        pick(c.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SwatchOption({
  color,
  selected,
  onPick,
}: {
  color: CatalogTextileColor;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      title={color.name}
      className={cn(
        'flex items-center gap-2 px-2 h-9 rounded-[var(--df-radius-sm)] border text-left transition-colors',
        selected
          ? 'border-[var(--df-accent)] bg-[var(--df-accent-soft)]'
          : 'border-[var(--df-border)] hover:bg-[var(--df-surface-2)]',
      )}
    >
      <span
        className="w-4 h-4 rounded-full shrink-0 border border-[rgba(0,0,0,0.12)]"
        style={{ background: color.hex }}
        aria-hidden
      />
      <span className="text-xs truncate text-[var(--df-ink)]">{color.name}</span>
    </button>
  );
}

function FlockSelect({
  mode,
  color,
  onMode,
  onColor,
}: {
  mode: FlockMode;
  color: string | null;
  onMode: (m: FlockMode) => void;
  onColor: (c: string) => void;
}) {
  const { flockColors } = useCatalog();
  const value = mode === 'multi' ? '__multi' : (color ?? '');
  const singleColors = flockColors.filter((c) => !c.special);
  const current = singleColors.find((c) => c.id === color);

  function handleChange(v: string) {
    if (v === '__multi') {
      onMode('multi');
    } else {
      onMode('single');
      onColor(v);
    }
  }

  return (
    <div className="relative">
      <select
        className="df-input appearance-none pl-10 pr-9 cursor-pointer h-12"
        value={value}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
        aria-label="Flocage"
      >
        <option value="__multi">Multi couleurs</option>
        <optgroup label="Couleur unique">
          {singleColors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </select>
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full pointer-events-none border border-[rgba(0,0,0,0.1)]"
        style={{
          background:
            mode === 'multi'
              ? 'conic-gradient(from 0deg, #c8261c, #f1c63a, #2c6041, #1f3aa8, #c8261c)'
              : (current?.hex ?? '#a4adb6'),
        }}
        aria-hidden
      />
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)] pointer-events-none"
        size={16}
        strokeWidth={1.8}
        aria-hidden
      />
    </div>
  );
}

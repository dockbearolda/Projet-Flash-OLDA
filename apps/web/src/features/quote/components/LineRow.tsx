import { useMemo } from 'react';
import { Boxes, ChevronDown, Link2, Link2Off, Plane, Ship, Trash2 } from 'lucide-react';
import {
  PRODUCTS,
  PLACEMENTS,
  TEXTILE_COLORS,
  FLOCK_COLORS,
  PRODUCT_BY_REF,
  TRANSPORT_OPTIONS,
} from '@df/shared';
import type {
  Product,
  ProductFamily,
  QuoteLine,
  Sizes,
  FlockMode,
  TextileColor,
  Transport,
} from '@df/shared';
import { fmtEUR } from '@/lib/format';
import { cn } from '@/lib/cn';
import { SegToggle } from '@/components/ui/SegToggle';
import { lineQty, unitPriceBreakdown, lineSubtotalHT } from '../pricing';
import { QtyGrid } from './QtyGrid';

interface Props {
  index: number;
  line: QuoteLine;
  quoteQty: number;
  /** Quote-level transport default — used when the line has no override. */
  transport: Transport;
  /** Quote-level revente default — used when the line has no override. */
  revente: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<Omit<QuoteLine, 'id'>>) => void;
  onSizes: (sizes: Sizes) => void;
  onFlockMode: (m: FlockMode) => void;
  onLinked: (b: boolean) => void;
  onLineTransport: (t: Transport) => void;
  onLineRevente: (b: boolean) => void;
  onRemove: () => void;
}

const FAMILY_LABEL: Record<ProductFamily, string> = {
  unisexe: 'Homme',
  femme: 'Femme',
  enfant: 'Enfant',
};

const FAMILY_ORDER: ProductFamily[] = ['unisexe', 'femme', 'enfant'];

const TRANSPORT_SEG_OPTIONS = [
  {
    value: 'maritime' as Transport,
    label: (
      <span className="inline-flex items-center gap-1">
        <Ship size={14} strokeWidth={1.8} aria-hidden /> Maritime
      </span>
    ),
  },
  {
    value: 'chronopost' as Transport,
    label: (
      <span className="inline-flex items-center gap-1">
        <Plane size={14} strokeWidth={1.8} aria-hidden /> Chrono
      </span>
    ),
  },
  {
    value: 'stock' as Transport,
    label: (
      <span className="inline-flex items-center gap-1">
        <Boxes size={14} strokeWidth={1.8} aria-hidden /> Stock
      </span>
    ),
  },
];

const TGCA_SEG_OPTIONS = [
  { value: 'apply' as const, label: 'Appliquée' },
  { value: 'exo' as const, label: 'Exonérée' },
];

export function LineRow({
  index,
  line,
  quoteQty,
  transport,
  revente,
  canRemove,
  onChange,
  onSizes,
  onFlockMode,
  onLinked,
  onLineTransport,
  onLineRevente,
  onRemove,
}: Props) {
  const product = PRODUCT_BY_REF[line.productRef];
  const qty = lineQty(line.sizes);
  const isLinked = line.linked;
  const effectiveTransport: Transport = line.transport ?? transport;
  const effectiveRevente = line.revente ?? revente;

  const transportPerPiece = useMemo(() => {
    return TRANSPORT_OPTIONS.find((t) => t.id === effectiveTransport)?.surcharge ?? 0;
  }, [effectiveTransport]);

  const breakdown = useMemo(() => {
    try {
      return unitPriceBreakdown({
        productRef: line.productRef,
        placementId: line.placementId,
        qty: quoteQty,
        code: line.code,
        transportPerPiece,
      });
    } catch {
      return null;
    }
  }, [line.productRef, line.placementId, quoteQty, line.code, transportPerPiece]);

  const subtotal = useMemo(() => {
    try {
      return lineSubtotalHT(line, quoteQty);
    } catch {
      return 0;
    }
  }, [line, quoteQty]);

  const groupedProducts = useMemo(() => {
    const byFamily = new Map<ProductFamily, Product[]>();
    for (const f of FAMILY_ORDER) byFamily.set(f, []);
    for (const p of PRODUCTS) byFamily.get(p.family)?.push(p);
    for (const list of byFamily.values())
      list.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    return byFamily;
  }, []);

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
      {/* Header — référence en titre */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-4 border-b border-[var(--df-border)]">
        <div className="flex items-baseline gap-3 flex-1 min-w-0">
          <span className="df-mono text-sm text-[var(--df-ink-3)] shrink-0">#{index + 1}</span>
          <span className="df-mono text-base text-[var(--df-ink-3)] shrink-0">
            {product?.ref ?? '—'}
          </span>
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
          <h3 className="df-display text-xl truncate text-[var(--df-ink)]">
            {product?.name ?? 'Produit ?'}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="df-caps">Transport</span>
          <SegToggle
            value={effectiveTransport}
            onChange={onLineTransport}
            options={TRANSPORT_SEG_OPTIONS}
            ariaLabel={`Transport ligne ${String(index + 1)}`}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="df-caps">TGCA</span>
          <SegToggle
            value={effectiveRevente ? 'exo' : 'apply'}
            onChange={(v) => {
              onLineRevente(v === 'exo');
            }}
            options={TGCA_SEG_OPTIONS}
            ariaLabel={`TGCA ligne ${String(index + 1)}`}
          />
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

      {/* Row 1: dropdowns inline */}
      <div className="px-5 py-4 grid grid-cols-12 gap-3 items-end">
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

        <Field label="Coloris textile" className="col-span-3">
          <ColorSelect
            options={TEXTILE_COLORS}
            value={line.textileColorId}
            onChange={(v) => {
              onChange({ textileColorId: v });
            }}
            aria-label="Coloris textile"
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
            {PLACEMENTS.map((p) => (
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

      {/* Row 2: qty + price breakdown + totals */}
      <div className="px-5 pb-4 flex items-stretch gap-3 flex-wrap">
        <div className="flex items-center gap-3 px-4 h-14 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface-2)]">
          <div className="flex flex-col items-start">
            <span className="df-caps">Quantités</span>
            <span className="df-mono text-lg font-bold tabular-nums text-[var(--df-ink)]">
              {qty}
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-6 px-4 h-14 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)]">
          <div className="flex flex-col items-end">
            <span className="df-caps">PU HT</span>
            <span className="df-mono text-base tabular-nums text-[var(--df-ink-2)]">
              {fmtEUR.format(breakdown?.unitHT ?? 0)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="df-caps">Sous-total HT</span>
            <span className="df-display text-2xl tabular-nums text-[var(--df-ink)]">
              {fmtEUR.format(subtotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Qty grid — always visible */}
      <div className="px-5 pb-5 pt-1 border-t border-[var(--df-border)]">
        <QtyGrid sizes={line.sizes} onChange={onSizes} />
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
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
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

function ColorSelect({
  options,
  value,
  onChange,
  ...rest
}: {
  options: readonly TextileColor[];
  value: string;
  onChange: (v: string) => void;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const current = options.find((c) => c.id === value);
  return (
    <div className="relative">
      <select
        className="df-input appearance-none pl-10 pr-9 cursor-pointer h-12"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        {...rest}
      >
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full pointer-events-none border border-[rgba(0,0,0,0.1)]"
        style={{ background: current?.hex ?? '#a4adb6' }}
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
  const value = mode === 'multi' ? '__multi' : (color ?? '');
  const singleColors = FLOCK_COLORS.filter((c) => !c.special);
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

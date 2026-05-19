import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  COEFS,
  PLACEMENTS,
  PLACEMENT_BY_ID,
  PRODUCTS,
  PRODUCT_BY_REF,
  TRANSPORT_OPTIONS,
  ZONES,
  zoneSalePriceForQty,
} from '@df/shared';
import type { Placement, Product, ProductFamily, ZoneId } from '@df/shared';
import { fmtEUR } from '@/lib/format';
import { coefFor, round2, roundUp10Cents, viergePriceHT } from '../pricing';

const FAMILY_LABEL: Record<ProductFamily, string> = {
  unisexe: 'Homme',
  femme: 'Femme',
  enfant: 'Enfant',
};

const FAMILY_ORDER: ProductFamily[] = ['unisexe', 'femme', 'enfant'];

const QTY_TIERS = COEFS.map(([qty]) => qty);
const CHRONO_PER_PIECE = TRANSPORT_OPTIONS.find((t) => t.id === 'chronopost')?.surcharge ?? 1.5;

/** Largest tier ≤ qty (e.g. qty 27 → 20, qty 130 → 100, qty 200 → 150). */
function tierForQty(qty: number): number | null {
  if (qty < QTY_TIERS[0]) return null;
  let last = QTY_TIERS[0];
  for (const t of QTY_TIERS) {
    if (qty >= t) last = t;
    else return last;
  }
  return last;
}

export function PricingGrid({
  defaultRef = 'H-001',
  defaultPlacement = 'coeur-dos',
}: {
  defaultRef?: string;
  defaultPlacement?: string;
}) {
  const [productRef, setProductRef] = useState(defaultRef);
  const [placementId, setPlacementId] = useState(defaultPlacement);
  const [codePct, setCodePct] = useState(10);
  const [qtyInput, setQtyInput] = useState('');
  const product = PRODUCT_BY_REF[productRef];
  const placement = (PLACEMENT_BY_ID as Record<string, Placement | undefined>)[placementId];
  const zoneIds = useMemo<readonly ZoneId[]>(() => placement?.zones ?? [], [placement]);

  const parsedQty = qtyInput === '' ? null : parseInt(qtyInput, 10);
  const activeTier =
    parsedQty !== null && Number.isFinite(parsedQty) ? tierForQty(parsedQty) : null;

  const groupedProducts = useMemo(() => {
    const byFamily = new Map<ProductFamily, Product[]>();
    for (const f of FAMILY_ORDER) byFamily.set(f, []);
    for (const p of PRODUCTS) byFamily.get(p.family)?.push(p);
    for (const list of byFamily.values())
      list.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    return byFamily;
  }, []);

  const rows = useMemo(() => {
    if (!product) return [];
    return QTY_TIERS.map((qty) => {
      const coef = coefFor(qty);
      const vierge = viergePriceHT(product.priceAchat, coef);
      const zonePrices = zoneIds.map((z) => round2(zoneSalePriceForQty(z, qty)));
      const zonesSum = zonePrices.reduce((a, b) => a + b, 0);
      const base = vierge + zonesSum;
      const codeSurcharge = codePct > 0 ? roundUp10Cents(base * (codePct / 100)) : 0;
      const withCode = base + codeSurcharge;
      const withTransport = withCode + CHRONO_PER_PIECE;
      return {
        qty,
        coef,
        vierge: round2(vierge),
        zonePrices,
        base: round2(base),
        withCode: round2(withCode),
        withTransport: round2(withTransport),
      };
    });
  }, [product, codePct, zoneIds]);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--df-radius-lg)] border border-[var(--df-border)] bg-[var(--df-surface)] p-5 flex items-end gap-6 flex-wrap">
        <label className="flex flex-col gap-1.5 flex-1 min-w-[280px]">
          <span className="df-caps">Référence produit</span>
          <div className="relative">
            <select
              className="df-input appearance-none pr-9 cursor-pointer h-12"
              value={productRef}
              onChange={(e) => {
                setProductRef(e.target.value);
              }}
              aria-label="Référence produit"
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
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)] pointer-events-none"
              size={16}
              strokeWidth={1.8}
              aria-hidden
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <span className="df-caps">Placement DTF</span>
          <div className="relative">
            <select
              className="df-input appearance-none pr-9 cursor-pointer h-12"
              value={placementId}
              onChange={(e) => {
                setPlacementId(e.target.value);
              }}
              aria-label="Placement DTF"
            >
              {PLACEMENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)] pointer-events-none"
              size={16}
              strokeWidth={1.8}
              aria-hidden
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 w-32">
          <span className="df-caps">Quantité</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyInput}
            onChange={(e) => {
              setQtyInput(e.target.value.replace(/[^\d]/g, ''));
            }}
            placeholder="ex. 27"
            className="df-input h-12 text-center text-lg font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Quantité de la grille"
          />
        </label>

        <label className="flex flex-col gap-1.5 w-32">
          <span className="df-caps">Code</span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={codePct}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                const n = raw === '' ? 0 : parseInt(raw, 10);
                setCodePct(Math.max(0, Math.min(100, n)));
              }}
              className="df-input h-12 pr-8 text-center text-lg font-semibold tabular-nums"
              aria-label="Code (%)"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)] text-sm pointer-events-none">
              %
            </span>
          </div>
        </label>

        <div className="flex flex-col items-start gap-1">
          <span className="df-caps">PRIX ACHAT</span>
          <span className="df-display text-2xl tabular-nums text-[var(--df-ink)]">
            {fmtEUR.format(product?.priceAchat ?? 0)}
          </span>
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="df-caps">Transport</span>
          <span className="df-mono text-base text-[var(--df-ink-2)]">
            Chronopost · {fmtEUR.format(CHRONO_PER_PIECE)}/pièce
          </span>
        </div>
      </div>

      <div className="rounded-[var(--df-radius-lg)] border border-[var(--df-border)] bg-[var(--df-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--df-surface-2)] border-b border-[var(--df-border)]">
              <Th>Quantité</Th>
              <Th>Prix t-shirt Vierge</Th>
              {zoneIds.map((z) => (
                <Th key={z}>Vente {ZONES[z].label}</Th>
              ))}
              <Th>PRIX {placement?.label ?? 'impression'} HT</Th>
              <Th>PRIX + CODE</Th>
              <Th highlight>PRIX + CODE + transport</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = r.qty === activeTier;
              return (
                <tr
                  key={r.qty}
                  onClick={() => {
                    setQtyInput(String(r.qty));
                  }}
                  className={
                    active
                      ? 'cursor-pointer border-b border-[var(--df-accent)] last:border-0 bg-[var(--df-accent-soft)]'
                      : 'cursor-pointer border-b border-[var(--df-border)] last:border-0 hover:bg-[var(--df-surface-2)]'
                  }
                >
                  <Td active={active}>
                    <span
                      className={`df-mono text-base font-semibold tabular-nums ${
                        active ? 'text-[var(--df-accent)]' : 'text-[var(--df-ink)]'
                      }`}
                    >
                      {r.qty}
                    </span>
                  </Td>
                  <Td active={active}>{fmtEUR.format(r.vierge)}</Td>
                  {r.zonePrices.map((price, i) => (
                    <Td key={zoneIds[i]} active={active}>
                      {fmtEUR.format(price)}
                    </Td>
                  ))}
                  <Td active={active}>{fmtEUR.format(r.base)}</Td>
                  <Td active={active}>{fmtEUR.format(r.withCode)}</Td>
                  <Td highlight active={active}>
                    {fmtEUR.format(r.withTransport)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <th
      scope="col"
      className={`text-left px-4 py-3 df-caps ${highlight ? 'text-[var(--df-accent)]' : ''}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  highlight,
  active,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  active?: boolean;
}) {
  const cls = active
    ? highlight
      ? 'text-[var(--df-accent)] font-bold text-base'
      : 'text-[var(--df-accent)] font-semibold'
    : highlight
      ? 'text-[var(--df-accent)] font-bold text-base'
      : 'text-[var(--df-ink-2)]';
  return <td className={`px-4 py-2.5 df-mono tabular-nums ${cls}`}>{children}</td>;
}

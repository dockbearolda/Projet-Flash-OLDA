import { User, Phone, Mail, Building2 } from 'lucide-react';
import type { Customer } from '@df/shared';
import { DIAL_OPTIONS } from '../share';

interface Props {
  customer: Customer;
  onChange: (patch: Partial<Customer>) => void;
  /** Indicatif pays appliqué aux numéros locaux pour l'envoi WhatsApp. */
  dialCode: string;
  onDialCode: (code: string) => void;
  /** Champs manquants à signaler (rouge) après une tentative de génération. */
  missing?: { company?: boolean; name?: boolean; phone?: boolean; email?: boolean };
}

export function CustomerInline({ customer, onChange, dialCode, onDialCode, missing }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface-2)] px-2 py-1">
      <Field
        Icon={Building2}
        placeholder="Société"
        ariaLabel="Société du client"
        value={customer.company ?? ''}
        onChange={(v) => {
          onChange({ company: v });
        }}
        invalid={missing?.company}
        widthClass="min-w-[150px]"
      />
      <span className="text-[var(--df-ink-4)]">·</span>
      <Field
        Icon={User}
        placeholder="Nom & prénom"
        ariaLabel="Nom et prénom du contact"
        value={customer.name}
        onChange={(v) => {
          onChange({ name: v });
        }}
        invalid={missing?.name}
        widthClass="min-w-[150px]"
      />
      <span className="text-[var(--df-ink-4)]">·</span>
      <select
        aria-label="Indicatif pays du téléphone"
        value={dialCode}
        onChange={(e) => {
          onDialCode(e.target.value);
        }}
        title={DIAL_OPTIONS.find((o) => o.code === dialCode)?.hint}
        className="bg-transparent border-0 outline-none text-sm font-medium text-[var(--df-ink-2)] cursor-pointer pr-0.5"
      >
        {DIAL_OPTIONS.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
      <Field
        Icon={Phone}
        placeholder="Téléphone *"
        ariaLabel="Téléphone du client"
        value={customer.phone ?? ''}
        onChange={(v) => {
          onChange({ phone: v });
        }}
        invalid={missing?.phone}
        widthClass="min-w-[120px]"
        type="tel"
      />
      <span className="text-[var(--df-ink-4)]">·</span>
      <Field
        Icon={Mail}
        placeholder="Email *"
        ariaLabel="Email du client"
        value={customer.email ?? ''}
        onChange={(v) => {
          onChange({ email: v });
        }}
        invalid={missing?.email}
        widthClass="min-w-[170px]"
        type="email"
      />
    </div>
  );
}

function Field({
  Icon,
  placeholder,
  ariaLabel,
  value,
  onChange,
  invalid,
  widthClass,
  type = 'text',
}: {
  Icon: typeof User;
  placeholder: string;
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean | undefined;
  widthClass: string;
  type?: string | undefined;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <Icon
        size={15}
        strokeWidth={1.6}
        aria-hidden
        className={invalid ? 'text-[var(--df-danger)]' : 'text-[var(--df-ink-3)]'}
      />
      <input
        type={type}
        className={
          'bg-transparent border-0 outline-none text-sm font-medium text-[var(--df-ink)] ' +
          widthClass +
          (invalid ? ' placeholder:text-[var(--df-danger)]' : ' placeholder:text-[var(--df-ink-4)]')
        }
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        aria-label={ariaLabel}
        aria-invalid={invalid ? true : undefined}
      />
    </div>
  );
}

import { User, Phone, Mail } from 'lucide-react';
import type { Customer } from '@df/shared';

interface Props {
  customer: Customer;
  onChange: (patch: Partial<Customer>) => void;
  /** Champs manquants à signaler (rouge) après une tentative de génération. */
  missing?: { name?: boolean; phone?: boolean; email?: boolean };
}

export function CustomerInline({ customer, onChange, missing }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface-2)] px-2 py-1">
      <Field
        Icon={User}
        placeholder="Nom du client *"
        ariaLabel="Nom du client"
        value={customer.name}
        onChange={(v) => {
          onChange({ name: v });
        }}
        invalid={missing?.name}
        widthClass="min-w-[150px]"
      />
      <span className="text-[var(--df-ink-4)]">·</span>
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

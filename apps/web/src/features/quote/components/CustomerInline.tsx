import { User, Phone, Mail, Building2 } from 'lucide-react';
import type { Customer } from '@df/shared';
import { capitalizeWords } from '@/lib/format';
import { DIAL_OPTIONS } from '../share';

interface Props {
  customer: Customer;
  onChange: (patch: Partial<Customer>) => void;
  /** Indicatif pays appliqué aux numéros locaux pour l'envoi WhatsApp. */
  dialCode: string;
  onDialCode: (code: string) => void;
  /** Champs manquants à signaler (rouge) après une tentative de génération. */
  missing?: { company?: boolean; name?: boolean; phone?: boolean; email?: boolean } | undefined;
}

/**
 * Formulaire client empilé, vertical — vit dans le panneau récapitulatif,
 * révélé par le CTA « Lier un client ». Société OU nom satisfait l'identité ;
 * téléphone et email sont requis avant l'envoi.
 */
export function CustomerInline({ customer, onChange, dialCode, onDialCode, missing }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Field
        Icon={Building2}
        placeholder="Société"
        ariaLabel="Société du client"
        value={customer.company ?? ''}
        onChange={(v) => {
          onChange({ company: capitalizeWords(v) });
        }}
        invalid={missing?.company}
        autoCapitalize="words"
      />
      <Field
        Icon={User}
        placeholder="Nom & prénom"
        ariaLabel="Nom et prénom du contact"
        value={customer.name}
        onChange={(v) => {
          onChange({ name: capitalizeWords(v) });
        }}
        invalid={missing?.name}
        autoCapitalize="words"
      />
      <div
        className={
          'flex items-center gap-1.5 h-11 px-3 rounded-[var(--df-radius)] bg-[var(--df-surface)] border ' +
          (missing?.phone ? 'border-[var(--df-danger)]' : 'border-[var(--df-border)]')
        }
      >
        <Phone
          size={15}
          strokeWidth={1.6}
          aria-hidden
          className={missing?.phone ? 'text-[var(--df-danger)]' : 'text-[var(--df-ink-3)]'}
        />
        <select
          aria-label="Indicatif pays du téléphone"
          value={dialCode}
          onChange={(e) => {
            onDialCode(e.target.value);
          }}
          title={DIAL_OPTIONS.find((o) => o.code === dialCode)?.hint}
          className="bg-transparent border-0 outline-none text-sm font-medium text-[var(--df-ink-2)] cursor-pointer shrink-0"
        >
          {DIAL_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          className={
            'flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium text-[var(--df-ink)] ' +
            (missing?.phone
              ? 'placeholder:text-[var(--df-danger)]'
              : 'placeholder:text-[var(--df-ink-4)]')
          }
          placeholder="Téléphone *"
          value={customer.phone ?? ''}
          onChange={(e) => {
            onChange({ phone: e.target.value });
          }}
          aria-label="Téléphone du client"
          aria-invalid={missing?.phone ? true : undefined}
        />
      </div>
      <Field
        Icon={Mail}
        placeholder="Email *"
        ariaLabel="Email du client"
        value={customer.email ?? ''}
        onChange={(v) => {
          onChange({ email: v });
        }}
        invalid={missing?.email}
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
  type = 'text',
  autoCapitalize,
}: {
  Icon: typeof User;
  placeholder: string;
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean | undefined;
  type?: string | undefined;
  autoCapitalize?: string | undefined;
}) {
  return (
    <div
      className={
        'flex items-center gap-1.5 h-11 px-3 rounded-[var(--df-radius)] bg-[var(--df-surface)] border ' +
        (invalid ? 'border-[var(--df-danger)]' : 'border-[var(--df-border)]')
      }
    >
      <Icon
        size={15}
        strokeWidth={1.6}
        aria-hidden
        className={invalid ? 'text-[var(--df-danger)]' : 'text-[var(--df-ink-3)]'}
      />
      <input
        type={type}
        className={
          'flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium text-[var(--df-ink)] ' +
          (invalid ? 'placeholder:text-[var(--df-danger)]' : 'placeholder:text-[var(--df-ink-4)]')
        }
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        aria-label={ariaLabel}
        aria-invalid={invalid ? true : undefined}
        autoCapitalize={autoCapitalize}
      />
    </div>
  );
}

import { User } from 'lucide-react';
import type { Customer } from '@df/shared';

interface Props {
  customer: Customer;
  onChange: (patch: Partial<Customer>) => void;
}

export function CustomerInline({ customer, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <User size={16} strokeWidth={1.6} className="text-[var(--df-ink-3)]" aria-hidden />
      <input
        className="bg-transparent border-0 outline-none text-sm font-medium text-[var(--df-ink)] placeholder:text-[var(--df-ink-4)] min-w-[180px]"
        placeholder="Client / contact"
        value={customer.name}
        onChange={(e) => {
          onChange({ name: e.target.value });
        }}
        aria-label="Nom du client"
      />
    </div>
  );
}

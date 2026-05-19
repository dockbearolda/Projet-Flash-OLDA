import { SegToggle } from '@/components/ui/SegToggle';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
}

const OPTIONS = [
  { value: 'no' as const, label: 'Non' },
  { value: 'yes' as const, label: 'Oui' },
];

export function ReventeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="df-caps">Revente</div>
        <div className="text-[11px] text-[var(--df-ink-3)] mt-0.5">TGCA 4 % exonérée si oui</div>
      </div>
      <SegToggle
        value={value ? 'yes' : 'no'}
        onChange={(v) => {
          onChange(v === 'yes');
        }}
        options={OPTIONS}
        ariaLabel="Revente"
      />
    </div>
  );
}

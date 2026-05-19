import { useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import {
  Button,
  Chip,
  Input,
  Swatch,
  SegToggle,
  Card,
  CardHeader,
  CardBody,
} from '@/components/ui';

const DEMO_COLORS = [
  { id: 'blanc', name: 'Blanc', hex: '#f5f3ee' },
  { id: 'noir', name: 'Noir', hex: '#15161a' },
  { id: 'bleu-royal', name: 'Bleu royal', hex: '#1f3aa8' },
  { id: 'rouge', name: 'Rouge', hex: '#c8261c' },
  { id: 'kaki', name: 'Kaki', hex: '#787a44' },
  { id: 'corail', name: 'Corail', hex: '#ec6c54' },
  { id: 'menthe', name: 'Menthe', hex: '#a8d6c4' },
  { id: 'jaune', name: 'Jaune', hex: '#f1c63a' },
];

const SEG_BEST = [
  { value: 'best' as const, label: 'Best' },
  { value: 'all' as const, label: 'Tout' },
];

const SEG_MODE = [
  { value: 'multi' as const, label: 'Multi couleurs' },
  { value: 'single' as const, label: 'Couleur unique' },
];

export default function DevComponentsPage() {
  const [seg1, setSeg1] = useState<'best' | 'all'>('best');
  const [seg2, setSeg2] = useState<'multi' | 'single'>('multi');
  const [selected, setSelected] = useState<string>('bleu-royal');
  const [text, setText] = useState('');

  return (
    <div className="min-h-screen bg-[var(--df-bg)] p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <div className="df-caps mb-2">Devis Flash · Dev</div>
          <h1 className="df-display text-4xl">Composants</h1>
          <p className="mt-2 text-sm text-[var(--df-ink-3)]">Galerie des primitives UI · Étape 2</p>
        </div>

        <Section title="Typographie">
          <div className="space-y-3">
            <div className="df-display text-6xl">2 458,90 €</div>
            <div className="df-display text-3xl">DEV-2026-0184</div>
            <h2 className="text-2xl font-semibold tracking-tight">Section H2</h2>
            <p className="text-sm">Body 14px regular — production-grade calibre.</p>
            <p className="df-mono text-sm">Mono · NS300 · H-001</p>
            <div className="df-caps">Micro label caps</div>
          </div>
        </Section>

        <Section title="Boutons">
          <div className="flex flex-wrap items-end gap-3">
            <Button variant="primary" size="lg">
              <Plus size={18} strokeWidth={1.8} />
              Nouveau devis
            </Button>
            <Button variant="primary">
              <Send size={16} strokeWidth={1.8} />
              Envoyer
            </Button>
            <Button>Annuler</Button>
            <Button variant="ghost">
              <Trash2 size={16} strokeWidth={1.8} />
              Supprimer
            </Button>
            <Button disabled>Désactivé</Button>
          </div>
        </Section>

        <Section title="Chips">
          <div className="flex flex-wrap gap-2">
            <Chip>110 pièces</Chip>
            <Chip variant="accent">×1.46 coef</Chip>
            <Chip variant="success">Synchro OK</Chip>
            <Chip variant="warning">En attente</Chip>
            <Chip variant="danger">Échec sync</Chip>
            <Chip>Chronopost</Chip>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <Input
              placeholder="Nom du client"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
              }}
            />
            <Input type="number" placeholder="Quantité" />
          </div>
        </Section>

        <Section title="Segmented toggles">
          <div className="flex flex-col gap-3">
            <SegToggle
              value={seg1}
              onChange={setSeg1}
              options={SEG_BEST}
              ariaLabel="Best ou tous"
            />
            <SegToggle
              value={seg2}
              onChange={setSeg2}
              options={SEG_MODE}
              ariaLabel="Mode flocage"
            />
          </div>
        </Section>

        <Section title="Swatches — round grid">
          <div className="flex flex-wrap gap-2.5">
            {DEMO_COLORS.map((c) => (
              <Swatch
                key={c.id}
                hex={c.hex}
                name={c.name}
                size={40}
                selected={selected === c.id}
                onClick={() => {
                  setSelected(c.id);
                }}
              />
            ))}
            <Swatch
              hex={null}
              name="Multi"
              multi
              size={40}
              selected={selected === 'multi'}
              onClick={() => {
                setSelected('multi');
              }}
            />
          </div>
        </Section>

        <Section title="Swatches — sizes">
          <div className="flex items-end gap-3">
            <Swatch hex="#1f3aa8" name="24" size={24} />
            <Swatch hex="#1f3aa8" name="32" size={32} />
            <Swatch hex="#1f3aa8" name="40" size={40} />
            <Swatch hex="#1f3aa8" name="48" size={48} selected />
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="df-caps">Carte simple</div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-[var(--df-ink-2)]">
                  Bordure 1px, fond surface, rayon 14px.
                </p>
              </CardBody>
            </Card>
            <Card elevated>
              <CardHeader>
                <div className="df-caps">Carte surélevée</div>
              </CardHeader>
              <CardBody>
                <div className="df-display text-3xl">2 458,90 €</div>
                <div className="mt-2 text-xs text-[var(--df-ink-3)]">Total HT</div>
              </CardBody>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="df-caps mb-4">{title}</div>
      {children}
    </section>
  );
}

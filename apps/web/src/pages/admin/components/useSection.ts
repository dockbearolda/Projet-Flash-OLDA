import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface SectionController<T> {
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Local editing state for one admin section. The editor should be mounted with
 * `key={catalogVersion}` so a successful save (which bumps the store version)
 * remounts it with the fresh server values.
 */
export function useSection<T>(
  initial: T,
  save: (value: T) => Promise<unknown>,
): SectionController<T> {
  const [draft, setDraft] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const onCancel = useCallback(() => {
    setDraft(initial);
  }, [initial]);

  const onSave = useCallback(() => {
    setSaving(true);
    void (async () => {
      try {
        await save(draft);
        toast.success('Modifications enregistrées');
        // The store version bump remounts this editor with fresh data.
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur inconnue';
        toast.error('Échec de l’enregistrement', { description: msg });
        setSaving(false);
      }
    })();
  }, [draft, save]);

  return { draft, setDraft, dirty, saving, onSave, onCancel };
}

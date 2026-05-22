import { useCallback, useState } from 'react';

export type ThemeId =
  | 'sable'
  | 'lin'
  | 'argile'
  | 'blush'
  | 'brume'
  | 'ocean'
  | 'givre'
  | 'foret'
  | 'prune'
  | 'nuit';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  dark: boolean;
  /** Couleurs littérales pour l'aperçu (indépendantes du thème actif). */
  preview: {
    bg: string;
    surface: string;
    border: string;
    accent: string;
    ink: string;
    ink3: string;
  };
}

export const DEFAULT_THEME: ThemeId = 'sable';

export const THEMES: ThemeMeta[] = [
  {
    id: 'sable',
    name: 'Sable',
    tagline: 'Chaud & neutre · défaut',
    dark: false,
    preview: {
      bg: '#e8e5dd',
      surface: '#f6f3ed',
      border: 'rgba(38, 34, 26, 0.12)',
      accent: '#2f5a7a',
      ink: '#1b1813',
      ink3: '#6e6a5d',
    },
  },
  {
    id: 'lin',
    name: 'Lin',
    tagline: 'Ivoire chaud, denim',
    dark: false,
    preview: {
      bg: '#ece7dc',
      surface: '#f8f4ec',
      border: 'rgba(44, 36, 22, 0.12)',
      accent: '#3f6b9a',
      ink: '#1e1a13',
      ink3: '#726a59',
    },
  },
  {
    id: 'argile',
    name: 'Argile',
    tagline: 'Crème chaud, terracotta',
    dark: false,
    preview: {
      bg: '#ece4da',
      surface: '#f8f3ec',
      border: 'rgba(46, 32, 20, 0.12)',
      accent: '#b4502e',
      ink: '#211a14',
      ink3: '#756656',
    },
  },
  {
    id: 'blush',
    name: 'Blush',
    tagline: 'Rosé pâle, vieux rose',
    dark: false,
    preview: {
      bg: '#eee4e3',
      surface: '#faf3f2',
      border: 'rgba(46, 26, 24, 0.12)',
      accent: '#b15566',
      ink: '#1d1615',
      ink3: '#786361',
    },
  },
  {
    id: 'brume',
    name: 'Brume',
    tagline: 'Gris doux, bleu acier',
    dark: false,
    preview: {
      bg: '#e9ebee',
      surface: '#f8f9fb',
      border: 'rgba(24, 28, 34, 0.12)',
      accent: '#4a6f96',
      ink: '#181a1d',
      ink3: '#686d74',
    },
  },
  {
    id: 'ocean',
    name: 'Océan',
    tagline: 'Gris frais, bleu vif',
    dark: false,
    preview: {
      bg: '#e7eaee',
      surface: '#f7f9fb',
      border: 'rgba(20, 30, 42, 0.12)',
      accent: '#0a6cff',
      ink: '#15191e',
      ink3: '#626a73',
    },
  },
  {
    id: 'givre',
    name: 'Givre',
    tagline: 'Glacé, turquoise',
    dark: false,
    preview: {
      bg: '#e2eaea',
      surface: '#f3f8f8',
      border: 'rgba(18, 34, 34, 0.12)',
      accent: '#0e8a83',
      ink: '#141a1a',
      ink3: '#5d6a6a',
    },
  },
  {
    id: 'foret',
    name: 'Forêt',
    tagline: 'Vert sauge, émeraude',
    dark: false,
    preview: {
      bg: '#e3e8e2',
      surface: '#f4f7f3',
      border: 'rgba(22, 34, 22, 0.12)',
      accent: '#2f7d52',
      ink: '#161a16',
      ink3: '#616a5f',
    },
  },
  {
    id: 'prune',
    name: 'Prune',
    tagline: 'Neutre froid, violet',
    dark: false,
    preview: {
      bg: '#e8e6ec',
      surface: '#f7f5fa',
      border: 'rgba(30, 24, 42, 0.12)',
      accent: '#6248d4',
      ink: '#18161d',
      ink3: '#676273',
    },
  },
  {
    id: 'nuit',
    name: 'Nuit',
    tagline: 'Sombre, contrasté',
    dark: true,
    preview: {
      bg: '#16181c',
      surface: '#1e2127',
      border: 'rgba(255, 255, 255, 0.14)',
      accent: '#4f93ff',
      ink: '#f3f4f6',
      ink3: '#8b919b',
    },
  },
];

const STORAGE_KEY = 'df:theme';

function isThemeId(v: string | null): v is ThemeId {
  return v != null && THEMES.some((t) => t.id === v);
}

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(v)) return v;
  } catch {
    /* localStorage indisponible — on retombe sur le défaut */
  }
  return DEFAULT_THEME;
}

/** Applique le thème : attribut sur <html>, mémorisation locale, couleur de barre. */
export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.dfTheme = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* écriture impossible — le thème reste appliqué pour la session */
  }
  const meta = THEMES.find((t) => t.id === id);
  const tag = document.querySelector('meta[name="theme-color"]');
  if (meta && tag) tag.setAttribute('content', meta.preview.bg);
}

export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme);
  const select = useCallback((id: ThemeId) => {
    applyTheme(id);
    setTheme(id);
  }, []);
  return [theme, select];
}

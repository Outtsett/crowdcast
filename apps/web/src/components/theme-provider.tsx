'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ */
/*  Named color themes (each with light + dark variants in CSS)        */
/* ------------------------------------------------------------------ */

export const THEMES = [
  { id: 'default', name: 'Default', description: 'Clean neutral gray', preview: { light: '#171717', dark: '#e5e5e5' } },
  { id: 'ocean', name: 'Ocean', description: 'Cool blue waters', preview: { light: '#0369a1', dark: '#38bdf8' } },
  { id: 'sunset', name: 'Sunset', description: 'Warm golden hour', preview: { light: '#c2410c', dark: '#fb923c' } },
  { id: 'forest', name: 'Forest', description: 'Earthy greens', preview: { light: '#15803d', dark: '#4ade80' } },
  { id: 'lavender', name: 'Lavender', description: 'Soft purple haze', preview: { light: '#7c3aed', dark: '#a78bfa' } },
  { id: 'rose', name: 'Rose', description: 'Warm pink blush', preview: { light: '#e11d48', dark: '#fb7185' } },
  { id: 'midnight', name: 'Midnight', description: 'Deep indigo night', preview: { light: '#4338ca', dark: '#818cf8' } },
  { id: 'ember', name: 'Ember', description: 'Fiery crimson', preview: { light: '#dc2626', dark: '#f87171' } },
] as const;

export type ColorThemeId = (typeof THEMES)[number]['id'];

/* ------------------------------------------------------------------ */
/*  Color\u2011theme context (separate from light/dark mode)                */
/* ------------------------------------------------------------------ */

interface ColorThemeCtx {
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
}

const ColorThemeContext = createContext<ColorThemeCtx>({
  colorTheme: 'default',
  setColorTheme: () => {},
});

export const useColorTheme = () => useContext(ColorThemeContext);

const STORAGE_KEY = 'crowdcast-color-theme';

function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>('default');

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ColorThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setColorThemeState(stored);
      if (stored !== 'default') {
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, []);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    setColorThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
    if (id === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', id);
    }
  }, []);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Combined provider                                                   */
/* ------------------------------------------------------------------ */

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ColorThemeProvider>{children}</ColorThemeProvider>
    </NextThemesProvider>
  );
}

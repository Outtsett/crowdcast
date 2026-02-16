'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export const THEMES = [
  { id: 'light', name: 'Light', swatch: '#ffffff' },
  { id: 'dark', name: 'Dark', swatch: '#0a0a0a' },
  { id: 'ocean', name: 'Ocean', swatch: '#0c4a6e' },
  { id: 'coral', name: 'Coral', swatch: '#f97066' },
  { id: 'sunset', name: 'Sunset', swatch: '#7c2d12' },
  { id: 'forest', name: 'Forest', swatch: '#14532d' },
  { id: 'neon', name: 'Neon', swatch: '#d946ef' },
  { id: 'lavender', name: 'Lavender', swatch: '#c4b5fd' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={['light', 'dark', 'ocean', 'coral', 'sunset', 'forest', 'neon', 'lavender']}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

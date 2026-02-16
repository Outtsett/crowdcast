'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useColorTheme, THEMES } from './theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon, Monitor, Check, Palette } from 'lucide-react';

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Palette className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Theme &amp; appearance</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* ---- Mode section ---- */}
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Mode</p>
        <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
          <Sun className="h-4 w-4" />
          Light
          {theme === 'light' && <Check className="h-3.5 w-3.5 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
          <Moon className="h-4 w-4" />
          Dark
          {theme === 'dark' && <Check className="h-3.5 w-3.5 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2">
          <Monitor className="h-4 w-4" />
          System
          {theme === 'system' && <Check className="h-3.5 w-3.5 ml-auto" />}
        </DropdownMenuItem>

        <Separator className="my-1" />

        {/* ---- Color theme section ---- */}
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Theme</p>
        <div className="grid grid-cols-4 gap-1.5 px-2 pb-2">
          {THEMES.map((t) => {
            const isActive = colorTheme === t.id;
            const swatch = isDark ? t.preview.dark : t.preview.light;
            return (
              <button
                key={t.id}
                type="button"
                title={t.name}
                onClick={() => setColorTheme(t.id)}
                className={`relative h-7 w-7 rounded-full border-2 transition-all ${
                  isActive
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:border-muted-foreground/50 hover:scale-105'
                }`}
                style={{ backgroundColor: swatch }}
              >
                {isActive && (
                  <Check
                    className="absolute inset-0 m-auto h-3.5 w-3.5"
                    style={{ color: isDark ? '#000' : '#fff' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useColorTheme, THEMES } from './theme-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSelector() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="space-y-6">
      {/* ---- Appearance Mode ---- */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Appearance</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Choose between light and dark mode, or follow your system.
        </p>
        <div className="flex gap-2">
          {[
            { value: 'light' as const, label: 'Light', icon: Sun },
            { value: 'dark' as const, label: 'Dark', icon: Moon },
            { value: 'system' as const, label: 'System', icon: Monitor },
          ].map((m) => {
            const Icon = m.icon;
            const isActive = theme === m.value;
            return (
              <Button
                key={m.value}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setTheme(m.value)}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ---- Color Theme ---- */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Color Theme</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pick a color scheme. Each theme works in both light and dark mode.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const isActive = colorTheme === t.id;
            const lightColor = t.preview.light;
            const darkColor = t.preview.dark;
            return (
              <Card
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => setColorTheme(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setColorTheme(t.id);
                  }
                }}
                className={`relative cursor-pointer transition-all hover:shadow-md ${
                  isActive
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-foreground/20'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  {/* Light + Dark preview swatches side by side */}
                  <div className="flex gap-1.5">
                    <div
                      className="flex-1 h-8 rounded-md border border-border"
                      style={{ backgroundColor: lightColor }}
                      title={`${t.name} Light`}
                    />
                    <div
                      className="flex-1 h-8 rounded-md border border-border"
                      style={{ backgroundColor: darkColor }}
                      title={`${t.name} Dark`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    {isActive && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {t.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

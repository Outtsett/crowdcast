'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { THEMES } from './theme-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

export function ThemeSelector() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Theme</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a visual theme for the app.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {THEMES.map((t) => {
          const isActive = theme === t.id;
          return (
            <Card
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setTheme(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTheme(t.id);
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
                <div
                  className="h-10 w-full rounded-md border border-border"
                  style={{ backgroundColor: t.swatch }}
                />
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t.name}</span>
                  {isActive && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Store, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const navItems: { href: string; label: string; icon: string | LucideIcon }[] = [
  { href: '/', label: 'Home', icon: 'H' },
  { href: '/explore', label: 'Explore', icon: 'E' },
  { href: '/communities', label: 'Communities', icon: 'C' },
  { href: '/create', label: 'Create Poll', icon: '+' },
  { href: '/marketplace', label: 'Creator Hub', icon: Store },
  { href: '/globe', label: 'Vote Globe', icon: Globe },
  { href: '/notifications', label: 'Notifications', icon: 'N' },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'L' },
  { href: '/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/pricing', label: 'Pricing', icon: '$' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 flex-col gap-1 p-4 border-r min-h-[calc(100vh-3.5rem)]">
      {navItems.map((item) => {
        const IconComponent = typeof item.icon !== 'string' ? item.icon : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
              pathname === item.href && 'bg-accent font-medium'
            )}
          >
            {IconComponent ? (
              <IconComponent className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <span className="w-5 text-center font-mono text-xs text-muted-foreground">{item.icon as string}</span>
            )}
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}

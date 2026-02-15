'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: 'H' },
  { href: '/explore', label: 'Explore', icon: 'E' },
  { href: '/communities', label: 'Communities', icon: 'C' },
  { href: '/create', label: 'Create Poll', icon: '+' },
  { href: '/marketplace', label: 'Marketplace', icon: 'M' },
  { href: '/notifications', label: 'Notifications', icon: 'N' },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'L' },
  { href: '/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/pricing', label: 'Pricing', icon: '$' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 flex-col gap-1 p-4 border-r min-h-[calc(100vh-3.5rem)]">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
            pathname === item.href && 'bg-accent font-medium'
          )}
        >
          <span className="w-5 text-center font-mono text-xs text-muted-foreground">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </aside>
  );
}

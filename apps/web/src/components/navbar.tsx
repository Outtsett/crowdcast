import Link from 'next/link';
import { UserMenu } from './user-menu';
import { ThemeToggle } from './theme-toggle';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          Crowdcast
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

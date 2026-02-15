import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6 max-w-6xl mx-auto">
          <Link href="/" className="font-bold text-2xl tracking-tight">
            Crowdcast
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/explore" className="text-sm text-muted-foreground hover:text-foreground">Explore</Link>
            <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">Marketplace</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button asChild><Link href="/signup">Get Started Free</Link></Button>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t py-12 px-6">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="font-bold text-lg mb-3">Crowdcast</h3>
            <p className="text-sm text-muted-foreground">The community polling platform. Create polls, join communities, share your voice.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore" className="hover:text-foreground">Explore</Link></li>
              <li><Link href="/communities" className="hover:text-foreground">Communities</Link></li>
              <li><Link href="/marketplace" className="hover:text-foreground">Marketplace</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Creators</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              <li><Link href="/marketplace/create" className="hover:text-foreground">Sell on Marketplace</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">About</a></li>
              <li><a href="#" className="hover:text-foreground">Blog</a></li>
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; 2026 Crowdcast. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

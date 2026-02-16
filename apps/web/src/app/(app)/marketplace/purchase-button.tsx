'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart } from 'lucide-react';

interface PurchaseButtonProps {
  itemId: string;
  price: number;
  isOwn: boolean;
}

export function PurchaseButton({ itemId, price, isOwn }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  if (isOwn) {
    return (
      <Button variant="outline" disabled className="w-full text-xs">
        Your listing
      </Button>
    );
  }

  const handlePurchase = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        setError(data.error || 'Purchase failed');
        return;
      }

      // Refresh the page to show updated "Purchased" state
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing\u2026
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            Buy \u2014 ${(price / 100).toFixed(2)}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive mt-1.5 text-center">{error}</p>
      )}
    </div>
  );
}

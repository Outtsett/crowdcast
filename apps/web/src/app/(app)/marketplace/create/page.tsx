export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ExchangeListingForm } from './item-form';
import { Sparkles } from 'lucide-react';

export default async function CreateExchangeListingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Creator Exchange</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create a Listing</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Share your best poll packs, community access, or data insights with the
          Crowdcast community. You keep <strong>85%</strong> of every sale \u2014 payouts
          monthly via Stripe Connect.
        </p>
      </div>
      <ExchangeListingForm userId={user.id} />
    </div>
  );
}

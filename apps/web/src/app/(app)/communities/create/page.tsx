export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CommunityForm } from './community-form';

export default async function CreateCommunityPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check community limit for free users
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const { count } = await supabase
    .from('communities')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', user.id);

  const isFree = !profile || profile.subscription_tier === 'free';
  const atLimit = isFree && (count ?? 0) >= 3;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold">Create Community</h1>
      {atLimit ? (
        <div className="border rounded-lg p-6 text-center space-y-3">
          <p className="font-medium">Community limit reached</p>
          <p className="text-sm text-muted-foreground">
            Free accounts can create up to 3 communities. Upgrade to Pro for unlimited communities.
          </p>
          <Button asChild><a href="/pricing">View Plans</a></Button>
        </div>
      ) : (
        <CommunityForm userId={user.id} />
      )}
    </div>
  );
}

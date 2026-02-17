export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase-server';
import { GlobeView } from './globe-view';

export const metadata: Metadata = {
  title: 'Vote Globe',
  description: 'See where votes are being cast around the world in real-time on Crowdcast.',
  openGraph: {
    title: 'Crowdcast Vote Globe',
    description: 'A 3D interactive globe showing where polls are being voted on around the world.',
  },
};

export default async function GlobePage() {
  const supabase = await createServerClient();

  // Fetch global vote locations
  const { data: locations } = await supabase
    .from('global_vote_locations')
    .select('lat, lng, country_code, vote_count');

  // Fetch recent active polls with votes for the stats sidebar
  const { data: stats } = await supabase
    .from('polls')
    .select('total_votes')
    .eq('status', 'active');

  const totalActivePolls = stats?.length || 0;
  const totalVotes = stats?.reduce((sum, p) => sum + p.total_votes, 0) || 0;

  // Count unique countries
  const countries = new Set(
    (locations || []).filter((l) => l.country_code).map((l) => l.country_code)
  );

  return (
    <GlobeView
      locations={locations || []}
      totalVotes={totalVotes}
      totalActivePolls={totalActivePolls}
      totalCountries={countries.size}
    />
  );
}

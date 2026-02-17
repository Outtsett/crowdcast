import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET /api/vote/locations?poll_id=xxx  — per-poll locations
// GET /api/vote/locations               — global locations
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const pollId = request.nextUrl.searchParams.get('poll_id');

  if (pollId) {
    // Per-poll geospatial data
    const { data, error } = await supabase
      .from('poll_vote_locations')
      .select('lat, lng, country_code, vote_count')
      .eq('poll_id', pollId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  }

  // Global geospatial data
  const { data, error } = await supabase
    .from('global_vote_locations')
    .select('lat, lng, country_code, vote_count');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

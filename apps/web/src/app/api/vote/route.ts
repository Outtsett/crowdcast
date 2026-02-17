import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { poll_id, option_id, rank_position, rating_value, text_response } = body;

  if (!poll_id || !option_id) {
    return NextResponse.json({ error: 'poll_id and option_id are required' }, { status: 400 });
  }

  // Extract geolocation from request headers (Vercel / Cloudflare)
  const latitude = parseFloat(
    request.headers.get('x-vercel-ip-latitude') ||
    request.headers.get('cf-iplatitude') ||
    ''
  ) || null;
  const longitude = parseFloat(
    request.headers.get('x-vercel-ip-longitude') ||
    request.headers.get('cf-iplongitude') ||
    ''
  ) || null;
  const country_code =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    null;

  const voteRow: Record<string, unknown> = {
    poll_id,
    option_id,
    user_id: user.id,
    latitude,
    longitude,
    country_code,
  };

  if (rank_position != null) voteRow.rank_position = rank_position;
  if (rating_value != null) voteRow.rating_value = rating_value;
  if (text_response != null) voteRow.text_response = text_response;

  const { data, error } = await supabase
    .from('votes')
    .insert(voteRow)
    .select('id')
    .single();

  if (error) {
    // Unique constraint violation means already voted
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already voted' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const communityId = formData.get('communityId') as string;

  if (!communityId) {
    return NextResponse.json({ error: 'Missing communityId' }, { status: 400 });
  }

  await supabase.from('community_members')
    .insert({ community_id: communityId, user_id: user.id, role: 'member' });

  const referer = request.headers.get('referer') || '/';
  return NextResponse.redirect(new URL(referer, request.url));
}

import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const targetId = formData.get('targetId') as string;
  const action = formData.get('action') as string;

  if (!targetId) {
    return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
  }

  if (action === 'unfollow') {
    await supabase.from('follows').delete()
      .eq('follower_id', user.id).eq('following_id', targetId);
  } else {
    await supabase.from('follows')
      .insert({ follower_id: user.id, following_id: targetId });
  }

  const referer = request.headers.get('referer') || '/';
  return NextResponse.redirect(new URL(referer, request.url));
}

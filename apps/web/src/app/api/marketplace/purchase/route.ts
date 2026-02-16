import { createServerClient } from '@/lib/supabase-server';
import { rateLimit, getRateLimitId, rateLimitHeaders } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Rate limit: 10 purchase actions per minute
  const rl = rateLimit(getRateLimitId(request, 'purchase'), { limit: 10 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { itemId } = await request.json();

  if (!itemId) {
    return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
  }

  const { data: item } = await supabase
    .from('exchange_listings')
    .select('*')
    .eq('id', itemId)
    .eq('is_active', true)
    .single();

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Don't allow buying own items
  if (item.creator_id === user.id) {
    return NextResponse.json({ error: 'Cannot buy your own item' }, { status: 400 });
  }

  // Check if already purchased
  const { data: existing } = await supabase
    .from('exchange_purchases')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
  }

  // TODO: Create Stripe Checkout session before recording purchase
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const session = await stripe.checkout.sessions.create({...});

  const platformFee = Math.round(item.price_cents * 0.15);
  const sellerAmount = item.price_cents - platformFee;

  await supabase.from('exchange_purchases').insert({
    buyer_id: user.id,
    item_id: itemId,
    seller_id: item.creator_id,
    amount_cents: item.price_cents,
    platform_fee_cents: platformFee,
    seller_amount_cents: sellerAmount,
    status: 'pending',
  });

  return NextResponse.json({
    message: 'Payment required \u2014 complete checkout to finalize purchase',
    item: item.name,
    amount: `$${(item.price_cents / 100).toFixed(2)}`,
    status: 'pending',
  });
}

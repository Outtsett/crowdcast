import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Stripe price IDs (configure these in your Stripe dashboard)
const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
  business: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business_monthly',
};

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const tier = url.searchParams.get('tier');

  if (!tier || !PRICE_IDS[tier]) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  // In production, create a Stripe Checkout session here:
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const session = await stripe.checkout.sessions.create({
  //   customer_email: user.email,
  //   line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
  //   mode: 'subscription',
  //   success_url: `${url.origin}/settings?upgraded=true`,
  //   cancel_url: `${url.origin}/pricing`,
  //   metadata: { user_id: user.id, tier },
  // });
  // return NextResponse.redirect(session.url!);

  // Placeholder response until Stripe is configured
  return NextResponse.json({
    message: 'Stripe checkout will be configured here',
    tier,
    user_id: user.id,
    setup: 'Add STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID to env',
  });
}

import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Stripe Price IDs — set these in your Stripe dashboard, then add to .env
const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  business: process.env.STRIPE_BUSINESS_PRICE_ID || '',
};

/**
 * Creates a Stripe Checkout session for the requested subscription tier.
 * Redirects the user to Stripe's hosted checkout page.
 */
export async function GET(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated users get redirected to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const tier = url.searchParams.get('tier');

  // Validate tier param and ensure a price ID is configured
  if (!tier || !PRICE_IDS[tier] || PRICE_IDS[tier] === '') {
    return NextResponse.json(
      { error: 'Invalid or unconfigured tier. Set STRIPE_PRO_PRICE_ID / STRIPE_BUSINESS_PRICE_ID in env.' },
      { status: 400 }
    );
  }

  try {
    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,              // Pre-fill the email field
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      mode: 'subscription',                    // Recurring billing
      success_url: `${url.origin}/settings?upgraded=true`,
      cancel_url: `${url.origin}/pricing`,
      metadata: { user_id: user.id, tier },    // Passed back via webhook
    });

    // Redirect the browser to Stripe's hosted checkout
    return NextResponse.redirect(session.url!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe session creation failed';
    console.error(`Checkout error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

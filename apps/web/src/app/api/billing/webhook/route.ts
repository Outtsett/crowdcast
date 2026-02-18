import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * Stripe webhook handler.
 * Verifies the incoming event signature, then processes subscription lifecycle events.
 * Uses the Supabase service role client for admin-level DB writes.
 */
export async function POST(request: Request) {
  const body = await request.text(); // Raw body required for signature verification
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Verify the event originated from Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error';
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Service role client for admin operations (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    // New subscription activated via checkout
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier;

      if (userId && tier) {
        // Update the user's profile tier
        await supabase.from('profiles')
          .update({ subscription_tier: tier, stripe_customer_id: session.customer as string })
          .eq('id', userId);

        // Upsert subscription record
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: session.subscription as string,
          stripe_customer_id: session.customer as string,
          tier,
          status: 'active',
          current_period_start: new Date().toISOString(),
        });
      }
      break;
    }

    // Subscription renewed, upgraded, or payment status changed
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions')
        .update({
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    // Subscription canceled or expired — downgrade to free
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);

      // Look up the user and reset their tier
      const { data: sub } = await supabase.from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (sub) {
        await supabase.from('profiles')
          .update({ subscription_tier: 'free' })
          .eq('id', sub.user_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

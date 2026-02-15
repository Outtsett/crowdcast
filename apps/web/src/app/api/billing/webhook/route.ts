import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Stripe webhook handler
// In production: verify webhook signature with stripe.webhooks.constructEvent()
export async function POST(request: Request) {
  const body = await request.text();

  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const sig = request.headers.get('stripe-signature')!;
  // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

  // Use service role for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Placeholder: parse the event type
  const event = JSON.parse(body);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier;

      if (userId && tier) {
        await supabase.from('profiles')
          .update({ subscription_tier: tier, stripe_customer_id: session.customer })
          .eq('id', userId);

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
          tier,
          status: 'active',
          current_period_start: new Date().toISOString(),
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await supabase.from('subscriptions')
        .update({
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;

      await supabase.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);

      // Downgrade user to free
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

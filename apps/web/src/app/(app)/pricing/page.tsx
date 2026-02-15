export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    tier: 'free',
    features: [
      'All 7 poll types',
      'Unlimited voting',
      'Social feed & discovery',
      'Up to 3 communities',
      'Basic analytics',
      'Voting streaks & badges',
      'Leaderboards',
    ],
    cta: 'Current Plan',
    disabled: true,
  },
  {
    name: 'Pro',
    price: '$5.99',
    period: '/month',
    yearlyPrice: '$49.99/yr',
    tier: 'pro',
    popular: true,
    features: [
      'Everything in Free',
      'Tournament & branching polls',
      'Advanced analytics & heatmaps',
      'Custom branding on polls',
      'Poll scheduling',
      'Unlimited communities',
      'Export results (CSV, PDF)',
      'Verified badge',
      'Priority trending',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    name: 'Business',
    price: '$19.99',
    period: '/month',
    yearlyPrice: '$179.99/yr',
    tier: 'business',
    features: [
      'Everything in Pro',
      'Team workspaces',
      'Embeddable poll widgets',
      'REST API access',
      'Advanced moderation',
      'Audience segmentation',
      'A/B poll testing',
      'Slack & Discord integration',
      'Custom domain',
      'Priority support',
    ],
    cta: 'Upgrade to Business',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    tier: 'enterprise',
    features: [
      'Everything in Business',
      'SSO / SAML',
      'SLA guarantees',
      'Dedicated account manager',
      'Custom integrations',
      'Data residency & compliance',
      'Volume pricing',
    ],
    cta: 'Contact Sales',
  },
];

export default async function PricingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let currentTier = 'free';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    currentTier = profile?.subscription_tier || 'free';
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground text-lg">Start free, upgrade when you need more power</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Card key={plan.tier} className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>Most Popular</Badge>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              {plan.yearlyPrice && (
                <p className="text-xs text-muted-foreground">{plan.yearlyPrice} billed annually</p>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5 flex-shrink-0">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {currentTier === plan.tier ? (
                <Button variant="outline" disabled className="w-full">Current Plan</Button>
              ) : plan.tier === 'enterprise' ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:sales@crowdcast.app">Contact Sales</a>
                </Button>
              ) : plan.tier === 'free' ? (
                <Button variant="outline" disabled className="w-full">Free Forever</Button>
              ) : (
                <Button className="w-full" asChild>
                  <Link href={`/api/billing/checkout?tier=${plan.tier}`}>
                    {plan.cta}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

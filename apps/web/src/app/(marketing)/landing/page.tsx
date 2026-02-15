import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const FEATURES = [
  { title: '7 Poll Types', desc: 'Multiple choice, yes/no, rating, image, ranked choice, this-or-that, open-ended', icon: '&#9744;' },
  { title: 'Live Results', desc: 'Watch votes animate in real-time as your community weighs in', icon: '&#9889;' },
  { title: 'Communities', desc: 'Create topic-based groups. Sports, tech, food — your community, your polls', icon: '&#128101;' },
  { title: 'Gamification', desc: 'Earn XP, level up, unlock badges, compete on leaderboards', icon: '&#127942;' },
  { title: 'Creator Marketplace', desc: 'Sell poll templates, themes, and community access passes', icon: '&#128176;' },
  { title: 'Advanced Analytics', desc: 'Demographics, heatmaps, time-series — understand your audience', icon: '&#128200;' },
];

const STATS = [
  { label: 'Poll Types', value: '7' },
  { label: 'Free Features', value: '30+' },
  { label: 'Creator Revenue', value: '85%' },
  { label: 'Starting Price', value: '$0' },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-24 md:py-32 text-center max-w-4xl mx-auto">
        <Badge variant="secondary" className="mb-4">Now in Beta</Badge>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
          Your Voice.<br />Your Community.<br />
          <span className="text-primary">Your Polls.</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
          Create polls, build communities, and discover what the world thinks.
          Free forever, with powerful pro features when you need them.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/explore">Explore Polls</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Everything you need to poll</h2>
          <p className="text-muted-foreground mt-2">And most of it is completely free</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6">
                <div className="text-3xl mb-3" dangerouslySetInnerHTML={{ __html: feature.icon }} />
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">1</div>
              <h3 className="font-semibold mt-4">Create a Poll</h3>
              <p className="text-sm text-muted-foreground mt-2">Choose from 7 poll types. Add options, set a timer, pick a category.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">2</div>
              <h3 className="font-semibold mt-4">Share & Vote</h3>
              <p className="text-sm text-muted-foreground mt-2">Share with your community or the world. Watch results update in real-time.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">3</div>
              <h3 className="font-semibold mt-4">Grow & Earn</h3>
              <p className="text-sm text-muted-foreground mt-2">Build your audience, sell on the marketplace, unlock premium insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl font-bold">Ready to start polling?</h2>
        <p className="text-muted-foreground mt-2 mb-8">Join thousands of creators and communities. Free forever.</p>
        <Button size="lg" asChild>
          <Link href="/signup">Create Your First Poll</Link>
        </Button>
      </section>
    </div>
  );
}

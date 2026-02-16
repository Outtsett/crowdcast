export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { PollCard } from '@/components/poll-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES } from '@crowdcast/shared';
import Link from 'next/link';
import {
  Trophy, Cpu, Clapperboard, Landmark, UtensilsCrossed,
  Gamepad2, Music, Shirt, FlaskConical, Plane,
  Activity, GraduationCap, Briefcase, Palette, Laugh,
  DollarSign, Bitcoin, Building, BriefcaseBusiness,
  Heart, Users, Baby, PawPrint, Dumbbell,
  MapPin, Home, CalendarDays,
  Film, Tv, BookOpen, Sparkles, Headphones,
  Car, Leaf, Rocket, Clock, Brain,
  Church, Scale, Megaphone, PenTool, Wrench,
  MoreHorizontal,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof Trophy> = {
  Sports: Trophy, Technology: Cpu, Entertainment: Clapperboard, Politics: Landmark,
  Food: UtensilsCrossed, Gaming: Gamepad2, Music: Music, Fashion: Shirt,
  Science: FlaskConical, Travel: Plane, Health: Activity, Education: GraduationCap,
  Business: Briefcase, Art: Palette, Humor: Laugh,
  Finance: DollarSign, Crypto: Bitcoin, 'Real Estate': Building, Careers: BriefcaseBusiness,
  Relationships: Heart, Family: Users, Parenting: Baby, Pets: PawPrint, Fitness: Dumbbell,
  Local: MapPin, Neighborhood: Home, Events: CalendarDays,
  Movies: Film, 'TV Shows': Tv, Books: BookOpen, Anime: Sparkles, Podcasts: Headphones,
  Automotive: Car, Environment: Leaf, Space: Rocket, History: Clock, Philosophy: Brain,
  Religion: Church, Law: Scale, Marketing: Megaphone, Design: PenTool, DIY: Wrench,
  Other: MoreHorizontal,
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('status', 'active')
    .order('trending_score', { ascending: false })
    .limit(30);

  if (category) query = query.eq('category', category);
  if (q) query = query.ilike('question', `%${q}%`);

  const { data: polls } = await query;

  let userVotes: Record<string, string> = {};
  if (user && polls?.length) {
    const { data: votes } = await supabase
      .from('votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', polls.map((p) => p.id));
    votes?.forEach((v) => { userVotes[v.poll_id] = v.option_id; });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Explore</h1>
      <form action="/explore" method="GET">
        <Input name="q" placeholder="Search polls..." defaultValue={q} />
      </form>
      <div className="flex flex-wrap gap-2">
        <Link href="/explore">
          <Badge variant={!category ? 'default' : 'outline'} className="gap-1.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors">
            All
          </Badge>
        </Link>
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || MoreHorizontal;
          return (
            <Link key={cat} href={`/explore?category=${encodeURIComponent(cat)}`}>
              <Badge
                variant={category === cat ? 'default' : 'outline'}
                className="gap-1.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
                {cat}
              </Badge>
            </Link>
          );
        })}
      </div>
      <div className="space-y-4">
        {polls && polls.length > 0 ? (
          polls.map((poll) => (
            <PollCard key={poll.id}
              poll={{ ...poll, creator: poll.creator as any, options: (poll.options as any[]) || [] }}
              currentUserId={user?.id ?? null}
              userVoteOptionId={userVotes[poll.id] ?? null}
              compact />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-12">No polls found.</p>
        )}
      </div>
    </div>
  );
}

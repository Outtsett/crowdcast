export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('communities')
    .select('*')
    .eq('is_private', false)
    .order('member_count', { ascending: false })
    .limit(30);

  if (q) query = query.ilike('name', `%${q}%`);

  const { data: communities } = await query;

  let myCommunities: string[] = [];
  if (user) {
    const { data } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);
    myCommunities = data?.map((m) => m.community_id) || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Communities</h1>
        {user && (
          <Button asChild><Link href="/communities/create">Create Community</Link></Button>
        )}
      </div>
      <form action="/communities" method="GET">
        <Input name="q" placeholder="Search communities..." defaultValue={q} />
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        {communities?.map((community) => (
          <Link key={community.id} href={`/community/${community.slug}`}>
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{community.name}</CardTitle>
                  {community.is_private && <Badge variant="outline">Private</Badge>}
                </div>
                {community.category && <Badge variant="secondary">{community.category}</Badge>}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {community.description || 'No description'}
                </p>
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{community.member_count} members</span>
                  <span>{community.poll_count} polls</span>
                </div>
                {myCommunities.includes(community.id) && (
                  <Badge variant="default" className="mt-2">Joined</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {(!communities || communities.length === 0) && (
        <p className="text-center text-muted-foreground py-12">No communities found. Create the first one!</p>
      )}
    </div>
  );
}

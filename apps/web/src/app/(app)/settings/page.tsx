export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ProfileSettingsForm } from './profile-form';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/');

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold">Settings</h1>
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}

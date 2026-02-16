export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ProfileSettingsForm } from './profile-form';
import { DataManagement } from './data-management';
import { ThemeSelector } from '@/components/theme-selector';
import { Separator } from '@/components/ui/separator';

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
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-3xl font-bold">Settings</h1>
      <ProfileSettingsForm profile={profile} />
      <Separator />
      <ThemeSelector />
      <Separator />
      <DataManagement />
    </div>
  );
}

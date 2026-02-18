'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client singleton.
 * Uses @supabase/ssr's createBrowserClient which auto-manages
 * cookie-based auth sessions on the client side.
 *
 * Replaces the deleted @crowdcast/supabase/client package.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock next/headers ----
const mockGetAll = vi.fn();
const mockSet = vi.fn();
vi.mock('next/headers', () => ({
    cookies: vi.fn(() =>
        Promise.resolve({ getAll: mockGetAll, set: mockSet })
    ),
}));

// ---- Mock @supabase/ssr ----
const mockGetUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => ({
        auth: { getUser: mockGetUser },
    })),
}));

import { createServerClient } from '@/lib/supabase-server';

describe('createServerClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    });

    it('returns a Supabase client with auth methods', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

        const client = await createServerClient();
        const { data } = await client.auth.getUser();

        expect(data.user).toEqual({ id: 'u1' });
    });

    it('handles unauthenticated state', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const client = await createServerClient();
        const { data } = await client.auth.getUser();

        expect(data.user).toBeNull();
    });
});

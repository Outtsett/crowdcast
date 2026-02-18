import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/vote/route';
import { NextRequest } from 'next/server';

// ---- Supabase mock setup ----
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockGetUser = vi.fn();

// Chain: supabase.from('votes').insert().select().single()
const mockFrom = vi.fn(() => ({
    insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
            single: mockSingle,
        }),
    }),
}));

vi.mock('@/lib/supabase-server', () => ({
    createServerClient: vi.fn(() =>
        Promise.resolve({
            auth: { getUser: mockGetUser },
            from: mockFrom,
        })
    ),
}));

// ---- Helpers ----

/** Build a NextRequest with optional geo headers */
function buildRequest(
    body: Record<string, unknown>,
    geoHeaders?: Record<string, string>
): NextRequest {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (geoHeaders) {
        Object.entries(geoHeaders).forEach(([k, v]) => headers.set(k, v));
    }
    return new NextRequest('http://localhost/api/vote', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

// ---- Tests ----

describe('POST /api/vote', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when user is not authenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const res = await POST(buildRequest({ poll_id: 'p1', option_id: 'o1' }));

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 when poll_id is missing', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

        const res = await POST(buildRequest({ option_id: 'o1' }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('required');
    });

    it('returns 400 when option_id is missing', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

        const res = await POST(buildRequest({ poll_id: 'p1' }));

        expect(res.status).toBe(400);
    });

    it('returns vote id on successful vote', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockSingle.mockResolvedValue({ data: { id: 'vote-123' }, error: null });

        const res = await POST(buildRequest({ poll_id: 'p1', option_id: 'o1' }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.id).toBe('vote-123');

        // Verify the insert was called with the correct user_id
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({ poll_id: 'p1', option_id: 'o1', user_id: 'u1' })
        );
    });

    it('returns 409 when user has already voted (unique constraint)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockSingle.mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
        });

        const res = await POST(buildRequest({ poll_id: 'p1', option_id: 'o1' }));

        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.error).toBe('Already voted');
    });

    it('returns 500 on generic database error', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockSingle.mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation does not exist' },
        });

        const res = await POST(buildRequest({ poll_id: 'p1', option_id: 'o1' }));

        expect(res.status).toBe(500);
    });

    it('extracts Vercel geo headers into the vote row', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockSingle.mockResolvedValue({ data: { id: 'vote-456' }, error: null });

        const res = await POST(
            buildRequest({ poll_id: 'p1', option_id: 'o1' }, {
                'x-vercel-ip-latitude': '40.7128',
                'x-vercel-ip-longitude': '-74.0060',
                'x-vercel-ip-country': 'US',
            })
        );

        expect(res.status).toBe(200);
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                latitude: 40.7128,
                longitude: -74.006,
                country_code: 'US',
            })
        );
    });

    it('includes optional ranked choice fields when provided', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockSingle.mockResolvedValue({ data: { id: 'vote-789' }, error: null });

        const res = await POST(
            buildRequest({ poll_id: 'p1', option_id: 'o1', rank_position: 2/*, rating_value, text_response */ })
        );

        expect(res.status).toBe(200);
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({ rank_position: 2 })
        );
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// ---- Supabase mock ----
// vi.hoisted() ensures these are available inside vi.mock() factory functions
const { mockFrom, mockUpsert, mockUpdate, mockSelectSingle, mockConstructEvent } = vi.hoisted(() => {
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn() }) });
    const mockUpsert = vi.fn();
    const mockSelectSingle = vi.fn();
    const mockFrom = vi.fn((table: string) => {
        if (table === 'profiles') {
            return {
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            };
        }
        return {
            upsert: mockUpsert.mockResolvedValue({ error: null }),
            update: mockUpdate,
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: mockSelectSingle,
                }),
            }),
        };
    });
    const mockConstructEvent = vi.fn();
    return { mockFrom, mockUpsert, mockUpdate, mockSelectSingle, mockConstructEvent };
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('stripe', () => {
    const MockStripe = vi.fn().mockImplementation(() => ({
        webhooks: { constructEvent: mockConstructEvent },
    }));
    return { default: MockStripe };
});

// Import AFTER mocks are defined
import { POST } from '@/app/api/billing/webhook/route';

// ---- Helpers ----

/** Build a Request with optional stripe-signature header */
function buildWebhookRequest(body: object, sig?: string): Request {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (sig) headers.set('stripe-signature', sig);
    return new Request('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

// ---- Tests ----

describe('POST /api/billing/webhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 400 when stripe-signature header is missing', async () => {
        const res = await POST(buildWebhookRequest({ type: 'fake' }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Missing stripe-signature');
    });

    it('returns 400 when signature verification fails', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const res = await POST(buildWebhookRequest({ type: 'fake' }, 'bad_sig'));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Invalid signature');
    });

    it('returns 200 and processes checkout.session.completed', async () => {
        const fakeEvent = {
            type: 'checkout.session.completed' as const,
            data: {
                object: {
                    metadata: { user_id: 'u1', tier: 'pro' },
                    customer: 'cus_123',
                    subscription: 'sub_456',
                },
            },
        };
        mockConstructEvent.mockReturnValue(fakeEvent);

        const res = await POST(buildWebhookRequest({}, 'valid_sig'));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.received).toBe(true);
    });

    it('returns 200 and processes customer.subscription.deleted', async () => {
        const fakeEvent = {
            type: 'customer.subscription.deleted' as const,
            data: {
                object: { id: 'sub_456', status: 'canceled' },
            },
        };
        mockConstructEvent.mockReturnValue(fakeEvent);
        mockSelectSingle.mockResolvedValue({ data: { user_id: 'u1' } });

        const res = await POST(buildWebhookRequest({}, 'valid_sig'));

        expect(res.status).toBe(200);
    });
});

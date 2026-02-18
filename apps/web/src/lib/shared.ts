import { z } from 'zod';

/**
 * Shared constants and validation schemas for Crowdcast.
 * Replaces the deleted @crowdcast/shared package.
 */

// ---- Poll types ----

/** All supported poll types */
export const POLL_TYPES = [
    'multiple_choice',
    'yes_no',
    'rating',
    'image',
    'ranked_choice',
    'this_or_that',
    'open_ended',
] as const;

export type PollType = (typeof POLL_TYPES)[number];

// ---- Poll visibility ----

export const POLL_VISIBILITIES = ['public', 'private', 'unlisted', 'community'] as const;

export type PollVisibility = (typeof POLL_VISIBILITIES)[number];

// ---- Categories ----

/** 40+ poll categories used across explore, create, and community forms */
export const CATEGORIES = [
    'Sports', 'Technology', 'Entertainment', 'Politics',
    'Food', 'Gaming', 'Music', 'Fashion',
    'Science', 'Travel', 'Health', 'Education',
    'Business', 'Art', 'Humor',
    'Finance', 'Crypto', 'Real Estate', 'Careers',
    'Relationships', 'Family', 'Parenting', 'Pets', 'Fitness',
    'Local', 'Neighborhood', 'Events',
    'Movies', 'TV Shows', 'Books', 'Anime', 'Podcasts',
    'Automotive', 'Environment', 'Space', 'History', 'Philosophy',
    'Religion', 'Law', 'Marketing', 'Design', 'DIY',
    'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// ---- Zod schema for poll creation ----

/** Validates poll creation input on client and server */
export const createPollSchema = z.object({
    type: z.enum(POLL_TYPES),
    question: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    options: z.array(z.object({
        label: z.string().min(1).max(200),
        image_url: z.string().url().optional(),
    })).min(1).max(10),
    is_anonymous: z.boolean().default(false),
    closes_at: z.string().optional(),
    category: z.string().optional(),
    visibility: z.enum(POLL_VISIBILITIES).default('public'),
    invited_user_ids: z.array(z.string().uuid()).default([]),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;

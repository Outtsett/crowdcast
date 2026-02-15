import { z } from 'zod';

export const createPollSchema = z.object({
  type: z.enum([
    'multiple_choice', 'yes_no', 'rating', 'image',
    'ranked_choice', 'this_or_that', 'open_ended',
  ]),
  question: z.string().min(3).max(500),
  description: z.string().max(2000).optional(),
  options: z.array(
    z.object({
      label: z.string().min(1).max(200),
      image_url: z.string().url().optional(),
    })
  ).min(1).max(10),
  is_anonymous: z.boolean().default(false),
  allow_multiple: z.boolean().default(false),
  closes_at: z.string().datetime().optional(),
  category: z.string().optional(),
  tags: z.array(z.string().max(30)).max(5).default([]),
  community_id: z.string().uuid().optional(),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
});

export const createCommunitySchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  category: z.string().optional(),
  is_private: z.boolean().default(false),
});

export const createCommentSchema = z.object({
  poll_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional(),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

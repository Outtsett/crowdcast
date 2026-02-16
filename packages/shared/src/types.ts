export type PollType =
  | 'multiple_choice'
  | 'yes_no'
  | 'rating'
  | 'image'
  | 'ranked_choice'
  | 'this_or_that'
  | 'open_ended';

export type PollStatus = 'draft' | 'active' | 'closed';

export type PollVisibility = 'public' | 'private' | 'unlisted' | 'community';

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export type CommunityRole = 'admin' | 'moderator' | 'member';

export type ReactionType = 'like' | 'fire' | 'thinking' | 'laugh' | 'surprise';

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise';

export type NotificationType =
  | 'new_follower'
  | 'poll_vote'
  | 'poll_comment'
  | 'poll_reaction'
  | 'community_invite'
  | 'poll_closed'
  | 'achievement'
  | 'mention';

export const POLL_TYPES: PollType[] = [
  'multiple_choice', 'yes_no', 'rating', 'image',
  'ranked_choice', 'this_or_that', 'open_ended',
];

export const CATEGORIES = [
  // Core interest verticals
  'Sports', 'Technology', 'Entertainment', 'Politics', 'Food',
  'Gaming', 'Music', 'Fashion', 'Science', 'Travel',
  'Health', 'Education', 'Business', 'Art', 'Humor',
  // Finance & career
  'Finance', 'Crypto', 'Real Estate', 'Careers',
  // Lifestyle & social
  'Relationships', 'Family', 'Parenting', 'Pets', 'Fitness',
  // Community & local
  'Local', 'Neighborhood', 'Events',
  // Culture & media
  'Movies', 'TV Shows', 'Books', 'Anime', 'Podcasts',
  // Industry & niche
  'Automotive', 'Environment', 'Space', 'History', 'Philosophy',
  'Religion', 'Law', 'Marketing', 'Design', 'DIY',
  // Catch-all
  'Other',
] as const;

export const FREE_COMMUNITY_LIMIT = 3;

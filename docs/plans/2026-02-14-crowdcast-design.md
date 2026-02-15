# Crowdcast — Community Polling Platform Design

**Date**: 2026-02-14
**Status**: Approved

## Overview

Crowdcast is a hybrid social + community polling platform. Users create polls, follow creators, join topic-based communities, and vote on everything. Monetized via freemium SaaS tiers and a creator marketplace. No ads, no credits.

**Platforms**: Web (Next.js) + Mobile (React Native / Expo)
**Backend**: Supabase (PostgreSQL, Realtime, Auth, Storage, Edge Functions)
**Payments**: Stripe + Stripe Connect

---

## Free Features

### Poll Creation (All Free)
- Multiple choice (2-10 options)
- Yes/No (one-tap)
- Rating scale (1-5 stars or 1-10 slider)
- Image polls (photo upload, A vs B)
- Ranked choice (drag to rank)
- This or That (head-to-head battle polls)
- Open-ended text (with word cloud visualization)
- Timed polls (auto-close after hours/days/weeks)
- Anonymous voting toggle

### Social Features (All Free)
- Follow users and creators
- Social feed: Trending / For You / Following tabs
- Like, comment, react to polls
- Share via deep links + auto-generated OG social cards
- User profiles with poll history, stats, badges
- Push notifications (mobile) + in-app notifications
- Repost/quote-poll

### Communities (Free with limits)
- Create up to 3 communities (free)
- Join unlimited communities
- Community feed, description, rules
- Roles: Admin, Moderator, Member
- Public (discoverable) and Private (invite-only) communities
- Community-only polls

### Discovery (All Free)
- Trending — velocity of votes + engagement
- Explore — browse by category (Sports, Tech, Entertainment, Politics, Food, etc.)
- Search — polls, communities, users
- Daily Poll — one featured poll everyone sees
- Battle Mode — X vs Y debate polls

### Gamification (All Free)
- Voting streaks (daily login + vote)
- Badges/achievements
- XP and levels
- Leaderboards (per community + global)
- Prediction accuracy score (for prediction polls)

### Basic Analytics (Free)
- Total vote count and percentages
- Vote timestamp (when voting spiked)
- Geographic breakdown (country-level, opt-in)

---

## Premium Tiers

### Crowdcast Pro — $5.99/mo ($49.99/yr)

- Advanced Poll Types: Tournament brackets, conditional/branching polls, weighted voting, multi-round elimination
- Advanced Analytics: Demographics, time-series charts, engagement heatmaps, sentiment analysis
- Custom Branding: Colors, logos, fonts on polls; remove "Made with Crowdcast" watermark
- Poll Scheduling: Schedule polls to go live at specific times
- Unlimited Communities: Create unlimited (free = 3)
- Priority Trending: Subtle algorithmic boost in discovery
- Export Results: CSV, PDF, image export
- Pinned Polls: Pin up to 3 polls to profile
- Verified Badge

### Crowdcast Business — $19.99/mo ($179.99/yr)

- Everything in Pro
- Team Workspaces: Invite members, shared management, role-based permissions
- Embeddable Polls: White-label embed widgets (iframe + JS SDK)
- API Access: REST API for polls, results, integrations
- Advanced Moderation: Auto-mod, keyword filters, spam detection, bulk actions
- Audience Segmentation: Target polls to demographics or segments
- A/B Poll Testing: Two versions of a poll to test engagement
- Integrations: Slack, Discord, Zapier, Notion webhooks
- Custom Domain: Own domain for community pages
- Priority Support

### Crowdcast Enterprise — Custom pricing

- Everything in Business
- SSO/SAML authentication
- SLA guarantees + dedicated account manager
- Custom integrations and onboarding
- Compliance (GDPR tools, data residency)
- Volume pricing

---

## Creator Marketplace

Revenue split: Crowdcast 15%, Creator 85%. Payouts monthly via Stripe Connect.

### Sellable Items
- **Premium Poll Templates**: Designed interactive poll formats ($1-10)
- **Custom Themes**: Visual theme packs for polls and profiles ($2-5)
- **Community Access Passes**: Monthly membership fees for exclusive communities ($1-20/mo)
- **Poll Result Reports**: Detailed insights/analysis from large polls

---

## Technical Architecture

### Stack
- Web: Next.js 14+ (App Router)
- Mobile: React Native (Expo)
- Backend: Supabase (PostgreSQL, Realtime, Auth, Storage, Edge Functions)
- Payments: Stripe + Stripe Connect
- Styling: Tailwind CSS + shadcn/ui (web), NativeWind (mobile)
- State: Zustand
- Media: Supabase Storage + Sharp
- Analytics: PostHog
- Deployment: Vercel (web), EAS (mobile)
- Monorepo: Turborepo

### Database Schema (Core)

```
users / profiles
├── polls
│   ├── poll_options
│   ├── votes (unique: user_id + poll_id)
│   ├── poll_comments
│   └── poll_reactions
├── communities
│   ├── community_members (role: admin/mod/member)
│   ├── community_polls
│   └── community_rules
├── follows (follower_id → following_id)
├── notifications
├── subscriptions (stripe_customer_id, tier, status)
├── marketplace_items (type, price, creator_id)
├── marketplace_purchases
├── user_achievements / badges
├── streaks
└── reports / moderation_logs
```

### Realtime
- Every poll has a realtime channel — live-updating result bars
- Communities have presence channels — see who's online
- Notifications via Supabase Realtime (web) + Push (mobile)

### Key Decisions
1. Voting integrity: Unique constraint on user_id + poll_id. Anonymous polls store hash.
2. Trending: score = (votes_in_last_hour * recency_weight) + (comments * 0.5) + (shares * 2), decays over time
3. Feed: Start chronological + trending mix, add ML "For You" later
4. Images: Supabase Storage, server-side thumbnails, lazy-load
5. OG images: Edge Function generates dynamic share images

### Project Structure (Monorepo)

```
crowdcast/
├── apps/
│   ├── web/          — Next.js
│   └── mobile/       — Expo React Native
├── packages/
│   ├── shared/       — Types, utils, Zod schemas
│   ├── ui/           — Shared UI components
│   └── supabase/     — DB client, queries, realtime hooks
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
└── docs/
    └── plans/
```

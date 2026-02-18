# Supabase Migrations

Database schema for Crowdcast, applied in order via `supabase db reset` or `supabase migration up`.

## Migration Index

| # | File | Contents |
|---|---|---|
| 1 | `00001_profiles.sql` | `profiles` table, `handle_new_user` trigger, `handle_updated_at` function, RLS |
| 2 | `00002_polls.sql` | `polls`, `poll_options`, `votes` tables, vote-count triggers, RLS, indexes |
| 3 | `00003_social.sql` | `follows`, `poll_comments`, `poll_reactions`, `notifications` + comment-count trigger |
| 4 | `00004_communities.sql` | `communities`, `community_members`, `community_rules` + member-count trigger |
| 5 | `00005_gamification.sql` | `achievements`, `user_achievements`, `streaks` + seed achievements (12 rows) |
| 6 | `00006_search_and_rpc.sql` | Full-text search index, trending score RPC |
| 7 | `00007_subscriptions.sql` | `subscriptions`, `marketplace_items`, `marketplace_purchases`, `creator_payouts`, purchase-count trigger |
| — | ~~00008~~ | *Skipped — originally created then removed during development* |
| 9 | `00009_rename_marketplace.sql` | Rename marketplace → Creator Exchange |
| 10 | `00010_poll_visibility.sql` | Private/unlisted/community poll visibility + invite codes |
| 11 | `00011_remove_theme_listing_type.sql` | Remove theme listing type from exchange |
| — | ~~00012~~ | *Skipped — originally created then removed during development* |
| 13 | `00013_vote_geolocation.sql` | Lat/lng/country_code columns on `votes`, geo aggregate views |

> **Note**: Migrations 8 and 12 were created and later removed during development. The gaps are intentional and do not affect execution.

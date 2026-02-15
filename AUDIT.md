# Crowdcast Repository Audit Report

**Date:** 2026-02-15
**Scope:** Full codebase audit — security, code quality, architecture, testing, dependencies

---

## Executive Summary

Crowdcast is a polling and community platform built with **Next.js 16**, **TypeScript**, **Supabase**, and **Tailwind CSS** in a Turborepo monorepo. The project has solid architectural foundations — a clean monorepo layout, strict TypeScript, parameterized database queries, and proper RLS policies — but it has **critical gaps** that must be addressed before production: **zero test coverage**, **no CI/CD pipeline**, **missing security headers**, and **unverified Stripe webhooks**.

| Area | Rating | Critical Issues |
|------|--------|-----------------|
| Dependencies | Good | 0 |
| Security | Needs Work | 3 |
| Code Quality | Moderate | 5 |
| Testing | Critical | 2 |
| Architecture | Good | 1 |

---

## 1. Project Overview

- **Stack:** Next.js 16.1.6, React 19, TypeScript 5, Supabase, Tailwind CSS 4, Zod, Turborepo
- **Structure:**
  ```
  apps/web/           → Next.js web application
  packages/shared/    → Types, validators, constants
  packages/supabase/  → Supabase client/server wrappers
  supabase/           → Migrations + Edge Functions
  scripts/            → Build/deploy utilities
  ```
- **Key Features:** 7 poll types, communities, social (follows/reactions/comments), gamification, marketplace, Stripe billing, full-text search

---

## 2. Security Audit

### 2.1 Secrets & Credentials — MOSTLY CLEAN

- No hardcoded API keys or passwords in source code.
- `.gitignore` properly excludes `.env.local`, `.env*.local`, `.env.supabase`.
- `.env.example` provides a safe template.

**Issues found:**

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| S1 | Medium | `scripts/get-supabase-keys.mjs:7`, `scripts/get-service-key.mjs:7` | Supabase project ID `ttsuuzefunwzlkzycahh` is hardcoded. Move to environment variable. |
| S2 | Low | `scripts/setup-supabase.mjs:10` | Password generated with `Math.random()` — low entropy. Use `crypto.randomBytes()`. |

### 2.2 Stripe Webhook — CRITICAL

**Location:** `apps/web/src/app/api/billing/webhook/route.ts`

Stripe webhook signature verification is **commented out**. Any actor can POST to this endpoint and modify user subscription tiers in the database.

```typescript
// Current (INSECURE):
const event = JSON.parse(body);

// Required:
const sig = request.headers.get('stripe-signature')!;
const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
```

### 2.3 XSS — MEDIUM RISK

**Location:** `apps/web/src/app/(marketing)/landing/page.tsx:67`

```tsx
<div dangerouslySetInnerHTML={{ __html: feature.icon }} />
```

Currently safe (hardcoded HTML entities), but fragile. Replace with `lucide-react` icons (already a project dependency) to eliminate the risk entirely.

### 2.4 Security Headers — MISSING

No CSP, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy headers configured. Add them in `next.config.ts`:

```typescript
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
  ],
}],
```

### 2.5 SQL Injection — NOT VULNERABLE

All database queries use the Supabase parameterized query builder (`eq()`, `select()`, `insert()`). No raw SQL string concatenation detected. RLS policies enforce row-level authorization. Database constraints validate username format and enum values.

### 2.6 Authentication & Authorization — GOOD

- Supabase Auth with SSR cookie management.
- All API routes check `supabase.auth.getUser()` before operations.
- RLS policies restrict modifications to resource owners.
- **Recommendation:** Increase minimum password length from 6 to 8+ and add complexity requirements. Add rate limiting to auth endpoints.

### 2.7 API Route Input Validation — WEAK

Several API routes cast `formData.get()` results directly to `string` without validation:

```typescript
// apps/web/src/app/api/follow/route.ts
const targetId = formData.get('targetId') as string; // No validation
```

All API routes should validate inputs with Zod schemas (already available in `packages/shared`).

---

## 3. Code Quality Audit

### 3.1 TypeScript Strictness — GOOD WITH HOLES

All three `tsconfig.json` files enable `"strict": true`. However, **13+ `as any` type assertions** undermine this:

| Location | Code |
|----------|------|
| `apps/web/src/app/(app)/page.tsx:88` | `creator: poll.creator as any` |
| `apps/web/src/middleware.ts:21` | `options as any` |
| `apps/web/src/components/comments.tsx:54` | `(payload.new as any).id` |
| `apps/web/src/app/(app)/poll/[id]/page.tsx:90` | `{rules.map((rule: any) => ...)}` |
| Multiple marketplace/community pages | `{items?.map((item: any) => ...)}` |

**Fix:** Generate proper Supabase types with `supabase gen types typescript` and use them throughout.

### 3.2 Error Handling — INCONSISTENT

**Good patterns** (auth forms, edge functions):
```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Something went wrong';
  setError(message);
}
```

**Silent failures** (API routes):
```typescript
// apps/web/src/app/api/follow/route.ts — no error check
await supabase.from('follows').delete()
  .eq('follower_id', user.id).eq('following_id', targetId);

// apps/web/src/app/api/community/join/route.ts — no error handling
await supabase.from('community_members')
  .insert({ community_id: communityId, user_id: user.id, role: 'member' });
```

Every Supabase operation returns `{ data, error }`. The `error` field must be checked.

### 3.3 Code Duplication — MODERATE

1. **Supabase client creation** duplicated in `packages/supabase/src/server.ts` AND `apps/web/src/lib/supabase-server.ts`.
2. **Poll query + vote loading pattern** repeated in 4+ page components (`page.tsx`, `explore/page.tsx`, `community/[slug]/page.tsx`, `user/[username]/page.tsx`).
3. **User vote aggregation** (`votes?.forEach(v => userVotes[v.poll_id] = v.option_id)`) copied across pages.

**Fix:** Extract a shared `getPollsWithVotes()` data access function.

### 3.4 Linting — INCOMPLETE

- `apps/web` has ESLint configured (Next.js core-web-vitals + TypeScript).
- `packages/shared` and `packages/supabase` have `"lint": "echo ok"` — placeholder scripts that skip linting.
- No Prettier configuration.
- No pre-commit hooks.

---

## 4. Testing Audit — CRITICAL

### 4.1 Unit/Integration Tests — NONE

Zero test files found. No test framework (Jest/Vitest) is configured. No test dependencies in any `package.json`.

### 4.2 E2E Tests — CONFIGURED BUT EMPTY

Playwright `^1.58.2` is listed as a dev dependency at the root, but no test files or Playwright config were found.

### 4.3 What Needs Tests

| Priority | Area | Reason |
|----------|------|--------|
| Critical | API routes (`/api/billing`, `/api/follow`, `/api/community/join`, `/api/marketplace/purchase`) | Handle money and user data |
| Critical | Zod validators in `packages/shared` | Guard all user input |
| High | Poll voting logic | Core feature |
| High | Auth flows (signup, login, session) | Security boundary |
| Medium | React components (poll-card, comments, reactions) | User-facing behavior |
| Medium | Edge functions (trending, achievements, streaks) | Background processing |

---

## 5. Architecture Audit

### 5.1 Monorepo Structure — GOOD

Clean separation: `apps/web` for the application, `packages/shared` for portable types/validators, `packages/supabase` for database client wrappers. Turborepo handles build orchestration with proper caching.

### 5.2 Database Schema — WELL DESIGNED

Seven ordered migrations covering profiles, polls, social, communities, gamification, search/RPC, and subscriptions. Proper use of enums, foreign keys, check constraints, and RLS policies.

### 5.3 Missing Data Access Layer

Database queries are embedded directly in Next.js page components and API routes. There is no repository or service layer. This causes:
- Code duplication (see 3.3)
- Difficulty testing business logic in isolation
- Tight coupling between UI and data layer

### 5.4 CI/CD — MISSING

No `.github/workflows` directory. No automated checks on PRs for:
- Type checking
- Linting
- Tests
- Build verification

---

## 6. Dependency Audit

All major dependencies are current and from reputable sources:

| Package | Version | Status |
|---------|---------|--------|
| next | 16.1.6 | Current |
| react | 19.2.3 | Current |
| typescript | ^5 | Current |
| @supabase/supabase-js | ^2.45.0 | Current |
| zod | ^3.23.0 | Current |
| tailwindcss | ^4 | Current |
| turbo | ^2.3.0 | Current |
| playwright | ^1.58.2 | Current |

No known critical CVEs. No lock file (`package-lock.json`) was found at root — this should be committed to ensure reproducible builds.

---

## 7. Priority Action Items

### CRITICAL — Fix Before Production

1. **Implement Stripe webhook signature verification** (`apps/web/src/app/api/billing/webhook/route.ts`)
2. **Add a test framework and write tests** for API routes, validators, and core logic
3. **Set up CI/CD** (GitHub Actions) with lint, type-check, test, and build gates
4. **Add security headers** in `next.config.ts`

### HIGH — Fix Soon

5. **Add error checking** to all Supabase operations in API routes
6. **Validate all API route inputs** with Zod schemas
7. **Remove `dangerouslySetInnerHTML`** — use lucide-react icons
8. **Eliminate `as any` assertions** — generate and use Supabase types
9. **Enable linting** in `packages/shared` and `packages/supabase`
10. **Commit `package-lock.json`** for reproducible builds

### MEDIUM — Improve

11. Extract duplicated poll query logic into a data access layer
12. Remove duplicate Supabase server client (`apps/web/src/lib/supabase-server.ts`)
13. Add Prettier and pre-commit hooks
14. Strengthen password requirements (length 8+, complexity)
15. Add rate limiting to auth and billing endpoints
16. Move hardcoded Supabase project ref to environment variable

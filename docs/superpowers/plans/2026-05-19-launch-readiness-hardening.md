# Launch Readiness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production launch guardrails for environment validation, health checks, database security audits, route protection, and deployment documentation.

**Architecture:** Keep hardening code small and reusable. Environment validation lives in `lib/env`. The health endpoint returns only safe configuration booleans. Database launch checks live in pgTAP so they run with every Supabase test. Playwright adds unauthenticated protected-route smoke coverage.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Supabase CLI/pgTAP, Vitest, Playwright.

---

### Task 1: Environment Validation And Health Endpoint

**Files:**
- Create: `lib/env/runtime.ts`
- Create: `app/api/health/route.ts`
- Create: `tests/unit/env.test.ts`

- [ ] Write failing tests for env validation and safe health payloads.
- [ ] Implement runtime env validation with Zod.
- [ ] Implement `/api/health` without exposing secret values.
- [ ] Update Supabase client helpers to use centralized env helpers where practical.

### Task 2: Supabase Security Audit

**Files:**
- Create: `supabase/tests/launch_security_audit.sql`

- [ ] Add pgTAP tests that every public table has RLS enabled.
- [ ] Add pgTAP tests that `anon` has no direct table privileges in public.
- [ ] Add pgTAP tests that `app_private` functions are not executable by `anon`.

### Task 3: Route Protection E2E

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`

- [ ] Add unauthenticated route redirect smoke coverage for protected modules.
- [ ] Verify `/api/health` responds without leaking env values.

### Task 4: Launch Documentation

**Files:**
- Create: `docs/launch-readiness.md`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] Document required environment variables.
- [ ] Document staging setup and migration commands.
- [ ] Document security checklist.
- [ ] Document production verification commands.

### Task 5: Verification

- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.

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

- [x] Write failing tests for env validation and safe health payloads.
- [x] Implement runtime env validation with Zod.
- [x] Implement `/api/health` without exposing secret values.
- [x] Update Supabase client helpers to use centralized env helpers where practical.

### Task 2: Supabase Security Audit

**Files:**
- Create: `supabase/tests/launch_security_audit.sql`

- [x] Add pgTAP tests that every public table has RLS enabled.
- [x] Add pgTAP tests that `anon` has no direct table privileges in public.
- [x] Add pgTAP tests that `app_private` functions are not executable by `anon`.

### Task 3: Route Protection E2E

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`

- [x] Add unauthenticated route redirect smoke coverage for protected modules.
- [x] Verify `/api/health` responds without leaking env values.

### Task 4: Launch Documentation

**Files:**
- Create: `docs/launch-readiness.md`
- Modify: `.env.example`
- Modify: `README.md`

- [x] Document required environment variables.
- [x] Document staging setup and migration commands.
- [x] Document security checklist.
- [x] Document production verification commands.

### Task 5: Verification

- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Run `npx supabase db reset`.
- [x] Run `npx supabase test db`.
- [x] Run `npm run test:e2e`.
- [x] Commit implementation.

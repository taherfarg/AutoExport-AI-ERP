# Phase 9 AI Technical Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the permission-aware AI assistant, tool registry, request/action/approval storage, and AI dashboard.

**Architecture:** Supabase stores conversations, messages, requests, tool actions, approvals, document extraction jobs, and report requests. Next.js server actions validate AI input, enforce permissions, run a deterministic tool registry, optionally call OpenAI through server-only env vars, and write audit logs. Sensitive AI actions create approval rows instead of mutating business records.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Postgres/RLS, Supabase Auth, optional OpenAI Responses API via server-side fetch, Zod, Vitest, Playwright.

---

### Task 1: Database, RLS, Seeds, And pgTAP

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_9_ai_intelligence.sql`
- Create: `supabase/tests/phase_9_ai_intelligence.sql`

- [x] Create AI enums.
- [x] Create `ai_conversations`, `ai_messages`, `ai_requests`, `ai_actions`, `ai_approvals`, `ai_extracted_documents`, and `ai_report_requests`.
- [x] Add AI permissions or reuse `use_ai_assistant` with approval status controls.
- [x] Add indexes, grants, RLS, soft deletes, and updated_at triggers.
- [x] Seed one AI conversation/request example for existing companies.
- [x] Add pgTAP tests for RLS, tenant isolation, AI permissions, and approval queue records.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/ai/tools.ts`
- Create: `lib/ai/assistant.ts`
- Create: `lib/ai/format.ts`
- Create: `lib/validations/ai.ts`
- Create: `components/ai/ai-status-badge.tsx`
- Create: `tests/unit/ai.test.ts`

- [x] Write failing tests for permission-aware tool visibility, intent routing, answer cards, approval need detection, and validation.
- [x] Implement AI tool registry metadata.
- [x] Implement deterministic assistant routing and response formatting.
- [x] Add Zod schemas for asking AI, report requests, extraction requests, and approval decisions.
- [x] Add AI status badge.

### Task 3: Queries And Actions

**Files:**
- Create: `features/ai/queries.ts`
- Create: `features/ai/actions.ts`

- [x] Add AI permission helper.
- [x] Query dashboard data: conversations, messages, requests, actions, approvals, extraction jobs, and report requests.
- [x] Add `askAiAssistant` action.
- [x] Add `createAiReportRequest` action.
- [x] Add `createAiExtractionRequest` action.
- [x] Add `decideAiApproval` action.
- [x] Write audit logs for AI requests, tool actions, and approval decisions.
- [x] Revalidate `/ai` after mutations.

### Task 4: UI Route

**Files:**
- Create: `app/(app)/ai/page.tsx`

- [x] Build AI KPI cards.
- [x] Build Ask AI form with example questions.
- [x] Build answer panel and message timeline.
- [x] Build tool/action log.
- [x] Build approval queue controls.
- [x] Build report/extraction request forms.
- [x] Keep all controls permission-aware.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-9-ai-intelligence.md`

- [x] Extend E2E to ask AI, create report/extraction requests, and decide an approval.
- [x] Document AI behavior, OpenAI env vars, safety rules, and limitations.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Run `npx supabase db reset`.
- [x] Run `npx supabase test db`.
- [x] Run `npm run test:e2e`.
- [x] Commit implementation.

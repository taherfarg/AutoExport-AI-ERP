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

- [ ] Create AI enums.
- [ ] Create `ai_conversations`, `ai_messages`, `ai_requests`, `ai_actions`, `ai_approvals`, `ai_extracted_documents`, and `ai_report_requests`.
- [ ] Add AI permissions or reuse `use_ai_assistant` with approval status controls.
- [ ] Add indexes, grants, RLS, soft deletes, and updated_at triggers.
- [ ] Seed one AI conversation/request example for existing companies.
- [ ] Add pgTAP tests for RLS, tenant isolation, AI permissions, and approval queue records.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/ai/tools.ts`
- Create: `lib/ai/assistant.ts`
- Create: `lib/ai/format.ts`
- Create: `lib/validations/ai.ts`
- Create: `components/ai/ai-status-badge.tsx`
- Create: `tests/unit/ai.test.ts`

- [ ] Write failing tests for permission-aware tool visibility, intent routing, answer cards, approval need detection, and validation.
- [ ] Implement AI tool registry metadata.
- [ ] Implement deterministic assistant routing and response formatting.
- [ ] Add Zod schemas for asking AI, report requests, extraction requests, and approval decisions.
- [ ] Add AI status badge.

### Task 3: Queries And Actions

**Files:**
- Create: `features/ai/queries.ts`
- Create: `features/ai/actions.ts`

- [ ] Add AI permission helper.
- [ ] Query dashboard data: conversations, messages, requests, actions, approvals, extraction jobs, and report requests.
- [ ] Add `askAiAssistant` action.
- [ ] Add `createAiReportRequest` action.
- [ ] Add `createAiExtractionRequest` action.
- [ ] Add `decideAiApproval` action.
- [ ] Write audit logs for AI requests, tool actions, and approval decisions.
- [ ] Revalidate `/ai` after mutations.

### Task 4: UI Route

**Files:**
- Create: `app/(app)/ai/page.tsx`

- [ ] Build AI KPI cards.
- [ ] Build Ask AI form with example questions.
- [ ] Build answer panel and message timeline.
- [ ] Build tool/action log.
- [ ] Build approval queue controls.
- [ ] Build report/extraction request forms.
- [ ] Keep all controls permission-aware.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-9-ai-intelligence.md`

- [ ] Extend E2E to ask AI, create report/extraction requests, and decide an approval.
- [ ] Document AI behavior, OpenAI env vars, safety rules, and limitations.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.

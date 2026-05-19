# Phase 10 Reports Alerts Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production foundations for reports, smart alerts, notifications, chat, and audit visibility.

**Architecture:** Supabase owns the new reporting, alert/task, reminder, and chat tables with RLS and seed data. Next.js server actions validate mutations, enforce permissions through existing role data, write audit logs, and revalidate route segments. UI routes follow the existing operational dashboard pattern used by finance, export, documents, marketing, and AI.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Postgres/RLS, Supabase Auth, Zod, Vitest, Playwright, pgTAP.

---

### Task 1: Database, RLS, Seeds, And pgTAP

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_10_reports_alerts_chat.sql`
- Create: `supabase/tests/phase_10_reports_alerts_chat.sql`

- [x] Create report, alert, task, reminder, and chat enums.
- [x] Create `saved_reports`, `report_exports`, `report_schedules`, `alerts`, `tasks`, `task_comments`, `reminders`, `chat_threads`, `chat_participants`, `chat_messages`, and `chat_attachments`.
- [x] Add indexes, grants, RLS, soft deletes, and updated_at triggers.
- [x] Seed saved report definitions, smart alerts, tasks, reminders, and chat threads for existing companies.
- [x] Add pgTAP tests for RLS, tenant isolation, alert resolution, and chat access.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/operations/reports.ts`
- Create: `lib/operations/format.ts`
- Create: `lib/validations/operations.ts`
- Create: `components/operations/operations-status-badge.tsx`
- Create: `tests/unit/operations.test.ts`

- [x] Write failing unit tests for report summary calculations, alert priority formatting, task status labels, chat previews, and validation.
- [x] Implement report summary calculators using plain arrays.
- [x] Implement formatting helpers and status badge component.
- [x] Implement Zod schemas for report exports, schedules, alerts, tasks, messages, reminders, and notification reads.

### Task 3: Queries And Actions

**Files:**
- Create: `features/operations/queries.ts`
- Create: `features/operations/actions.ts`

- [x] Query report dashboard data.
- [x] Query alert/task/reminder data.
- [x] Query chat and audit data.
- [x] Add report export and schedule actions.
- [x] Add alert resolve, alert snooze, task create/update, reminder create, chat thread/message, chat task, and notification read actions.
- [x] Write audit logs for all mutations.
- [x] Revalidate affected routes after mutations.

### Task 4: UI Routes

**Files:**
- Create: `app/(app)/reports/page.tsx`
- Create: `app/(app)/operations/alerts/page.tsx`
- Create: `app/(app)/chat/page.tsx`
- Create: `app/(app)/settings/audit-logs/page.tsx`
- Modify: `lib/modules/module-registry.ts`

- [x] Build reports dashboard.
- [x] Build smart alerts and tasks page.
- [x] Build chat center.
- [x] Build audit log viewer.
- [x] Add sidebar route entries for operations alerts and chat.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-10-reports-alerts-chat.md`

- [x] Extend E2E to create a report export, resolve an alert, send chat, and view audit logs.
- [x] Document Phase 10 behavior, security model, and integration limits.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Run `npx supabase db reset`.
- [x] Run `npx supabase test db`.
- [x] Run `npm run test:e2e`.
- [x] Commit implementation.

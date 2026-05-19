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

- [ ] Create report, alert, task, reminder, and chat enums.
- [ ] Create `saved_reports`, `report_exports`, `report_schedules`, `alerts`, `tasks`, `task_comments`, `reminders`, `chat_threads`, `chat_participants`, `chat_messages`, and `chat_attachments`.
- [ ] Add indexes, grants, RLS, soft deletes, and updated_at triggers.
- [ ] Seed saved report definitions, smart alerts, tasks, reminders, and chat threads for existing companies.
- [ ] Add pgTAP tests for RLS, tenant isolation, alert resolution, and chat access.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/operations/reports.ts`
- Create: `lib/operations/format.ts`
- Create: `lib/validations/operations.ts`
- Create: `components/operations/operations-status-badge.tsx`
- Create: `tests/unit/operations.test.ts`

- [ ] Write failing unit tests for report summary calculations, alert priority formatting, task status labels, chat previews, and validation.
- [ ] Implement report summary calculators using plain arrays.
- [ ] Implement formatting helpers and status badge component.
- [ ] Implement Zod schemas for report exports, schedules, alerts, tasks, messages, reminders, and notification reads.

### Task 3: Queries And Actions

**Files:**
- Create: `features/operations/queries.ts`
- Create: `features/operations/actions.ts`

- [ ] Query report dashboard data.
- [ ] Query alert/task/reminder data.
- [ ] Query chat and audit data.
- [ ] Add report export and schedule actions.
- [ ] Add alert resolve, alert snooze, task create/update, reminder create, chat thread/message, chat task, and notification read actions.
- [ ] Write audit logs for all mutations.
- [ ] Revalidate affected routes after mutations.

### Task 4: UI Routes

**Files:**
- Create: `app/(app)/reports/page.tsx`
- Create: `app/(app)/operations/alerts/page.tsx`
- Create: `app/(app)/chat/page.tsx`
- Create: `app/(app)/settings/audit-logs/page.tsx`
- Modify: `lib/modules/module-registry.ts`

- [ ] Build reports dashboard.
- [ ] Build smart alerts and tasks page.
- [ ] Build chat center.
- [ ] Build audit log viewer.
- [ ] Add sidebar route entries for operations alerts and chat.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-10-reports-alerts-chat.md`

- [ ] Extend E2E to create a report export, resolve an alert, send chat, and view audit logs.
- [ ] Document Phase 10 behavior, security model, and integration limits.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.

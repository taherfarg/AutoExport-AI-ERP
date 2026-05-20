# Phase 20: Advanced AI Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build advanced AI automation engines for autonomous CRM outbounds, parts inventory reorders, vehicle merchandising, and document OCR intake processing.

**Architecture:** Supabase/Postgres owns automation agent records, extracted document logs, approval proposal queues, and RLS rules. Next.js server actions handle permission gates, validations, and trigger execution of proposals and scans. The UI follows the luxury automotive dashboard pattern with interactive panels and live file preview.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/RLS, Zod, Tailwind/shadcn-style components, Vitest, pgTAP, Playwright.

---

## File Map

- Create `supabase/migrations/<timestamp>_phase_20_advanced_ai_automation.sql`: enums, module/permissions, tables, triggers, RLS, grants, seed data.
- Create `supabase/tests/phase_20_advanced_ai_automation.sql`: pgTAP RLS, document parsing, and trigger execution tests.
- Create `lib/ai/automation-helpers.ts`: regex Heuristics for OCR parsing and proposal formatting.
- Create `lib/validations/ai.ts`: Zod validation schemas for AI configurations.
- Create `tests/unit/ai-automation.test.ts`: unit coverage for helper functions and Zod schemas.
- Create `features/ai/queries.ts`: service-role reads for agents, extractions, and proposals.
- Create `features/ai/actions.ts`: server actions with permission checking, audit logs, and downstream record inserts.
- Create `app/(app)/ai/automation/page.tsx`: production advanced AI automation console dashboard.
- Create `app/(app)/ai/automation/action-panels.tsx`: client-enhanced toggle and commit forms.
- Modify `lib/permissions/permissions.ts`: add AI permission constants.
- Modify `lib/modules/module-registry.ts`: add sidebar entry for Advanced AI.
- Modify `tests/e2e/auth-workspace.spec.ts`: protect route and extend E2E workflows.
- Create `docs/phase-20-advanced-ai-automation.md`: product documentation.
- Modify `README.md`: add Phase 20 module note.

---

## Task 1: Documentation

- [x] Create the Phase 20 design document at `docs/superpowers/specs/2026-05-20-phase-20-advanced-ai-automation-design.md`.
- [x] Create this implementation plan at `docs/superpowers/plans/2026-05-20-phase-20-advanced-ai-automation.md`.
- [ ] Commit the plans with:
  ```bash
  git add docs/superpowers/specs/2026-05-20-phase-20-advanced-ai-automation-design.md docs/superpowers/plans/2026-05-20-phase-20-advanced-ai-automation.md
  git commit -m "docs: plan phase 20 advanced ai automation"
  ```

---

## Task 2: Database, RLS, and pgTAP

- [ ] Run `npx supabase migration new phase_20_advanced_ai_automation`.
- [ ] Add enums: `ai_agent_type`, `ai_agent_status`, `ai_extraction_status`, `ai_proposal_type`, `ai_proposal_status`.
- [ ] Seed permissions: `view_ai_automation`, `manage_ai_automation`.
- [ ] Add tables: `ai_automation_agents`, `ai_document_extractions`, `ai_automation_proposals`.
- [ ] Add trigger `trg_audit_ai_automation` to log changes in `audit_logs`.
- [ ] Enable RLS and authenticated grants on all new tables.
- [ ] Add seed records for default agents and pending proposals.
- [ ] Create `supabase/tests/phase_20_advanced_ai_automation.sql` verifying schema constraints, RLS tenant isolation, and proposal commits.

---

## Task 3: Business Heuristics and Validation

- [ ] Write failing unit tests in `tests/unit/ai-automation.test.ts` for:
  - OCR regex parsing logic,
  - Proposal payload formatters,
  - Zod schemas validation rules.
- [ ] Implement `lib/ai/automation-helpers.ts` and `lib/validations/ai.ts`.
- [ ] Run `npm run test -- tests/unit/ai-automation.test.ts` and verify it passes.

---

## Task 4: Queries, Actions, and Downstream Triggers

- [ ] Implement query helpers in `features/ai/queries.ts`.
- [ ] Implement server actions in `features/ai/actions.ts`:
  - `toggleAutomationAgent`,
  - `triggerAutonomousScan`,
  - `triggerDocumentOcr`,
  - `commitDocumentOcr`,
  - `resolveAiProposal`.
- [ ] Enforce company and branch scope checks and RLS.
- [ ] Write audit logs for document extraction commits and proposal approvals.

---

## Task 5: UI & Navigation Integration

- [ ] Add `view_ai_automation` and `manage_ai_automation` in `lib/permissions/permissions.ts`.
- [ ] Register `Advanced AI` in `lib/modules/module-registry.ts`.
- [ ] Build `/app/(app)/ai/automation/page.tsx` with premium dashboard cards, switches, Side-by-side parsed forms, and approval queue cards.
- [ ] Build `/app/(app)/ai/automation/action-panels.tsx` client interactive forms with live user progress feedback.

---

## Task 6: E2E and Docs

- [ ] Protect `/ai/automation` in Route checks.
- [ ] Update `tests/e2e/auth-workspace.spec.ts` with autonomous scanner triggers, OCR file uploads, and approval resolutions.
- [ ] Create `docs/phase-20-advanced-ai-automation.md`.
- [ ] Update `README.md`.

---

## Task 7: Verification and Commit

- [ ] Run lint, unit test, build, migration test, and E2E suites.
- [ ] Commit all code changes with:
  ```bash
  git add .
  git commit -m "feat: add advanced ai automation phase"
  ```

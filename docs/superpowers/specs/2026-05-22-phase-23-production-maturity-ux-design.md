# Phase 23 Production Maturity UX Design

## Scope

This phase makes the already-built DMS modules feel more like a high-end production ERP without changing the database surface. The first slice focuses on the accounting, service workshop, and parts inventory pages because they are operationally important and currently read as long record lists with forms.

## Goals

- Add executive workflow cards that explain the operational state at a glance.
- Keep accounting, service, and parts pages responsive on laptop and mobile widths.
- Reduce brittle E2E timing waits by checking persisted, visible state.
- Preserve all existing features, permissions, schema, and server actions.

## UX Direction

The tone is premium operational SaaS: clear workflow posture, compact metrics, restrained color, and fast scanning. The new cards should feel like a control layer above the existing records, not a marketing hero or decorative section.

## Architecture

- Add a small workflow status helper in `lib/workflows/progress.ts`.
- Add a reusable server-rendered `WorkflowProgressCard` component.
- Use the component on:
  - `app/(app)/finance/accounting/page.tsx`
  - `app/(app)/service/workshop/page.tsx`
  - `app/(app)/parts/inventory/page.tsx`
- Update the main E2E flow to assert these cards are visible and replace selected fixed sleeps with reload-and-visible-state helpers.

## Testing

- Unit test the workflow status helper.
- Extend the existing E2E workflow to check the new operational cards.
- Run lint, unit tests, TypeScript, build, Supabase tests, and E2E before commit.


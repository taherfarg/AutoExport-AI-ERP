# Phase 20: Advanced AI Automation

Phase 20 upgrades AutoSphere ERP from a permission-aware AI assistant into an automation control layer with human approval. It adds autonomous agent configuration, OCR document intake, proposal execution, and audit-backed manager review.

## Scope

- Autonomous background agents for CRM follow-ups, parts reorders, and vehicle marketing.
- AI OCR document intake for vehicle titles and supplier invoices.
- Manager approval console for AI-generated business actions.
- Supabase tables, RLS policies, grants, audit triggers, and pgTAP coverage.
- Next.js server actions with permission gates and tenant-scoped downstream writes.

## Database Objects

Migration: `supabase/migrations/20260520141953_phase_20_advanced_ai_automation.sql`

Tables:

- `ai_automation_agents`
- `ai_document_extractions`
- `ai_automation_proposals`

Enums:

- `ai_agent_type`: `crm_follow_up`, `parts_reorder`, `vehicle_marketing`
- `ai_agent_status`: `idle`, `scanning`, `error`
- `ai_extraction_status`: `pending`, `completed`, `failed`
- `ai_proposal_type`: `lead_follow_up`, `parts_reorder`, `vehicle_marketing`
- `ai_proposal_status`: `pending`, `approved`, `dismissed`, `failed`

Permissions:

- `view_ai_automation`
- `manage_ai_automation`

## Workflows

The autonomous scan flow creates proposals only. It does not silently send customer messages, create purchase orders, or publish listings without manager approval.

The OCR flow stores an extraction record, parses raw document text into structured fields, shows the fields for review, then commits the approved data into either a vehicle record or a parts purchase order.

The proposal approval flow executes one of three controlled actions:

- Lead follow-up proposal creates a pending `follow_ups` record.
- Parts reorder proposal creates or reuses a supplier, creates or reuses a part, and creates a parts purchase order.
- Vehicle marketing proposal creates a `marketing_listings` record for an approved vehicle.

All sensitive transitions are written to `audit_logs`.

## UI

Route: `/ai/automation`

The page includes:

- Autonomous Background Agents switchboard.
- Smart OCR Document Intake panel.
- Manager Approval Console.

The route requires `view_ai_automation`. Mutating actions require `manage_ai_automation`.

## Verification

Focused checks:

```powershell
npm run lint
npx tsc --noEmit
npm run test -- tests/unit/ai-automation.test.ts
npx supabase test db
```

Full release checks should also include `npm run test`, `npm run build`, and the Playwright E2E suite.

## Current Limitations

- OCR is heuristic and simulated. Real OCR provider integration is still adapter-ready work.
- Autonomous agents are triggered manually from the dashboard. Scheduled background execution is the next production step.
- AI proposal payload editing is not yet exposed in the approval UI.
- External dispatch providers for WhatsApp, marketplaces, and suppliers are not live-connected yet.

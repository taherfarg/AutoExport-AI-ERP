# Phase 20: Advanced AI Automation Technical Design Specification

This specification outlines the technical design for **Phase 20: Advanced AI Automation** in AutoSphere ERP. It enhances the foundational AI layer (from Phase 9) with autonomous workflows, document OCR processing, and auto-dispatch proposals.

## 1. Product Capabilities

The advanced AI automation layer acts as an autonomous digital workforce across the ERP modules:

1. **Autonomous Agents**:
   - **Lead Follow-Up Agent**: Monitors CRM leads, analyzes customer timeline gaps, and compiles draft template messages for inactive leads.
   - **Parts Reorder Agent**: Monitors parts inventory, stock levels, and historical usage, identifies parts falling below safety thresholds, and drafts Purchase Orders for suppliers.
   - **Social Listing Agent**: Detects newly available vehicles and drafts multi-lingual marketing copy and calendar posts.
2. **AI Document Intake (OCR)**:
   - Simulates and provides active hooks for document data extraction.
   - Converts raw invoice/title uploads into structured forms (VIN, brand, cost, supplier) with an interface to verify and commit records directly into `vehicles` or `part_purchase_orders`.
3. **Manager Approval Console**:
   - A consolidated queue for autonomous proposals (outbounds, purchase orders, listings), allowing managers to inspect, edit, and approve actions.

---

## 2. Database Schema

We will add a new migration `supabase/migrations/<timestamp>_phase_20_advanced_ai_automation.sql`:

### 2.1 Enums

- `public.ai_agent_type` (`'lead_followup'`, `'parts_reorder'`, `'social_listing'`)
- `public.ai_agent_status` (`'active'`, `'inactive'`)
- `public.ai_extraction_status` (`'pending_review'`, `'committed'`, `'dismissed'`)
- `public.ai_proposal_type` (`'outbound_message'`, `'parts_purchase_order'`, `'marketing_listing'`)
- `public.ai_proposal_status` (`'pending_approval'`, `'approved'`, `'dismissed'`)

### 2.2 Tables

#### `public.ai_automation_agents`
- Configurations for autonomous background workers.
- Fields:
  - `id uuid primary key`
  - `company_id uuid references companies(id)`
  - `type ai_agent_type`
  - `status ai_agent_status default 'inactive'`
  - `settings jsonb default '{}'`
  - `last_run_at timestamptz`
  - shared auditing columns

#### `public.ai_document_extractions`
- Logs raw files and extracted key-value schemas.
- Fields:
  - `id uuid primary key`
  - `company_id uuid references companies(id)`
  - `document_id uuid references documents(id)`
  - `status ai_extraction_status default 'pending_review'`
  - `extracted_data jsonb default '{}'`
  - `committed_entity_type varchar` (e.g., `'vehicle'`, `'part_purchase_order'`)
  - `committed_entity_id uuid`
  - shared auditing columns

#### `public.ai_automation_proposals`
- The queue of autonomously drafted business actions.
- Fields:
  - `id uuid primary key`
  - `company_id uuid references companies(id)`
  - `branch_id uuid references branches(id)`
  - `type ai_proposal_type`
  - `status ai_proposal_status default 'pending_approval'`
  - `title varchar`
  - `description text`
  - `proposed_payload jsonb default '{}'`
  - `reviewed_by uuid references profiles(id)`
  - `reviewed_at timestamptz`
  - shared auditing columns

---

## 3. Row Level Security (RLS)

- Enable RLS on all three tables.
- Register new permissions `view_ai_automation` and `manage_ai_automation`.
- RLS policies require:
  - Active tenant membership (`company_id` check)
  - Permissions validation for reading/mutating.

---

## 4. Domain & Backend Logic

- `lib/ai/automation-helpers.ts`:
  - `parseOcrFields(docType: string, text: string): Record<string, any>`: Heuristics to parse VINs, prices, and suppliers.
  - `compileProposalPayload(type: string, data: Record<string, any>): Record<string, any>`: Formats autonomous actions into validated structures.
- `features/ai/queries.ts` & `actions.ts`:
  - `getAiAutomationAgents(companyId: string)`
  - `getAiDocumentExtractions(companyId: string)`
  - `getAiAutomationProposals(companyId: string)`
  - `toggleAutomationAgent(agentId: string, status: string)`
  - `triggerAutonomousScan(agentType: string)`: Performs simulated scans and populates the proposal queue.
  - `triggerDocumentOcr(documentId: string)`: Simulates parsing of uploaded invoices/titles.
  - `commitDocumentOcr(extractionId: string, data: Record<string, any>)`: Resolves parsing and inserts `vehicles` or `part_purchase_orders`.
  - `resolveAiProposal(proposalId: string, action: 'approve' | 'dismiss', editedPayload?: Record<string, any>)`: Executes proposal and saves changes.

---

## 5. UI Layout

A clean dashboard inside `/ai/automation` offering:
- **Autonomous Agents Switchboard**: Quick toggle state cards.
- **Document Intake Scanner**: Side-by-side file viewer and parsed schema forms.
- **Approval Queue Feed**: Clean cards describing the rationale ("Why AI generated this") and actionable payload triggers.

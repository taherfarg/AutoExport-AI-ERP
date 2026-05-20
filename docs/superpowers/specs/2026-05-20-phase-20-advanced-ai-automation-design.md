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

- `public.ai_agent_type` (`'crm_follow_up'`, `'parts_reorder'`, `'vehicle_marketing'`)
- `public.ai_agent_status` (`'idle'`, `'scanning'`, `'error'`)
- `public.ai_extraction_status` (`'pending'`, `'completed'`, `'failed'`)
- `public.ai_proposal_type` (`'lead_follow_up'`, `'parts_reorder'`, `'vehicle_marketing'`)
- `public.ai_proposal_status` (`'pending'`, `'approved'`, `'dismissed'`, `'failed'`)

### 2.2 Tables

#### `public.ai_automation_agents`
- Configurations for autonomous background workers.
- Fields:
  - `id uuid primary key`
  - `company_id uuid references companies(id)`
  - `agent_type ai_agent_type`
  - `is_enabled boolean default false`
  - `status ai_agent_status default 'idle'`
  - `config jsonb default '{}'`
  - `last_scan_at timestamptz`
  - shared auditing columns

#### `public.ai_document_extractions`
- Logs raw files and extracted key-value schemas.
- Fields:
  - `id uuid primary key`
  - `company_id uuid references companies(id)`
  - `branch_id uuid references branches(id)`
  - `file_path text`
  - `file_name text`
  - `file_type text`
  - `document_type text`
  - `status ai_extraction_status default 'pending'`
  - `extracted_data jsonb default '{}'`
  - `raw_text text`
  - `error_message text`
  - shared auditing columns

#### `public.ai_automation_proposals`
- The queue of autonomously drafted business actions.
- Fields:
  - `id uuid primary key`
  - `company_id uuid references companies(id)`
  - `branch_id uuid references branches(id)`
  - `agent_id uuid references ai_automation_agents(id)`
  - `proposal_type ai_proposal_type`
  - `status ai_proposal_status default 'pending'`
  - `title varchar`
  - `description text`
  - `justification text`
  - `proposed_payload jsonb default '{}'`
  - `resolved_by uuid references profiles(id)`
  - `resolved_at timestamptz`
  - `error_message text`
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
  - `parseOcrFields(docType: string, text: string): Record<string, unknown>`: Heuristics to parse VINs, prices, and suppliers.
  - `compileProposalPayload(type: string, data: Record<string, unknown>): Record<string, unknown>`: Formats autonomous actions into validated structures.
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

# Phase 9 AI Technical Intelligence Design

## Scope

Phase 9 builds the permission-aware AI layer for AutoSphere ERP. The first production version focuses on safe business Q&A, tool execution, draft generation, auditability, and human approval workflows. It does not let AI mutate sensitive business records directly.

## Production Outcomes

- AI assistant dashboard at `/ai`.
- AI conversations and messages stored per company.
- AI requests stored with model/provider metadata and status.
- AI tool executions stored as `ai_actions`.
- Human approval queue stored in `ai_approvals`.
- AI extracted document and AI report request tables for future document/report workflows.
- Permission-aware server-side tool registry.
- Deterministic local tool execution for common questions even when no API key is configured.
- Optional OpenAI Responses API call path through server-side `OPENAI_API_KEY`, designed around function/tool calling.

## AI Tool Architecture

Tools are server-side functions, never frontend calls. Each tool declares:

- `name`
- `description`
- `requiredPermissions`
- `sensitive`
- `requiresApproval`
- `execute(context, input)`

Initial tools:

- `getAvailableStock`
- `searchVehicles`
- `getVehicleDetails`
- `getLeadsDueToday`
- `getPendingPayments`
- `getMissingDocuments`
- `calculateVehiclePricing`
- `generateListingDraft`
- `generateSocialPostDraft`
- `createQuotationDraft`
- `createFollowUpTask`
- `generateReportDraft`

Permission checks are enforced before every tool execution. Finance and profit data require finance-related permissions. Draft generation can return proposed content, but write-like actions create approval records instead of directly changing business state.

## OpenAI Integration

The implementation uses an adapter pattern:

- If `OPENAI_API_KEY` is present, the server can call the OpenAI Responses API.
- Function calling is modeled according to current OpenAI guidance: the model receives tool definitions, may request tool calls, the app executes tools, and tool outputs are fed back before the final answer.
- If no API key is present, the assistant uses deterministic intent matching and still stores requests/messages/actions.

The server never exposes the API key to the browser. Provider metadata is stored in `ai_requests`.

## Database Design

New enums:

- `ai_conversation_status`
- `ai_message_role`
- `ai_request_status`
- `ai_action_status`
- `ai_approval_status`
- `ai_document_extraction_status`
- `ai_report_status`

New tables:

- `ai_conversations`
- `ai_messages`
- `ai_requests`
- `ai_actions`
- `ai_approvals`
- `ai_extracted_documents`
- `ai_report_requests`

All tenant-owned rows include `company_id`, creator/updater fields where applicable, timestamps, and soft deletes for ongoing operational records.

## Safety Rules

- AI cannot reveal data the user lacks permission to see.
- AI cannot record payments, mark vehicles sold, create final invoices, change prices, or send customer-facing messages directly.
- Sensitive proposed actions create `ai_approvals`.
- AI answers include a direct answer, optional metrics, related rows, and suggested actions.
- Every request and tool action is auditable.

## UI

Route: `/ai`

Sections:

- KPI cards for conversations, requests, actions, approvals, reports, and extraction jobs.
- Ask AI form.
- Recent conversation/message timeline.
- AI answer panel with metrics/table/actions.
- Tool execution log.
- Approval queue with approve/reject controls.
- AI report request form.

The page should feel like an operational assistant inside the ERP, not a chatbot demo.

## Tests

- pgTAP validates tables, RLS, permissions, tenant isolation, and approval insert behavior.
- Vitest validates permission filtering, tool routing, deterministic answer formatting, and Zod schemas.
- Playwright extends the workspace flow to ask an AI stock question, generate a listing/social draft, request a report draft, and approve/reject an AI action.

## Non-Goals

- No autonomous mutations of core business records.
- No voice commands yet.
- No OCR extraction implementation yet; only extraction request records.
- No streaming UI yet.

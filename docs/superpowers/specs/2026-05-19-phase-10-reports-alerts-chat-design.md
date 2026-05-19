# Phase 10 Reports Alerts Chat Design

Phase 10 completes the planned production foundation for reports, analytics, smart alerts, notifications, chat, and audit visibility. The goal is not to fake a full BI warehouse; it is to give dealerships tenant-secure operational reporting, actionable alert queues, internal collaboration, and audit review surfaces that future automation can build on.

## Scope

- Reports dashboard at `/reports`.
- Smart alerts and tasks page at `/operations/alerts`.
- Chat center page at `/chat`.
- Audit log viewer at `/settings/audit-logs`.
- Saved report definitions, report export records, and report schedules.
- Alert records, task records, task comments, and reminders.
- Chat threads, participants, messages, and attachment metadata.
- Notification center behavior using the existing `notifications` table.
- Server-side calculations for inventory, sales, finance, export, marketing, and branch summaries.

## Existing Foundations

- `notifications` and `audit_logs` already exist from Phase 1 with RLS.
- `view_reports` and `view_audit_logs` already exist.
- Prior phases already write audit logs for sensitive business actions.
- The sidebar already contains a `reports` module entry.

## Database Design

Phase 10 adds:

- `saved_reports`: tenant-scoped report definitions with filters and visibility.
- `report_exports`: CSV/PDF/Excel/email export request records. CSV is the active export path; PDF/Excel/email remain architecture-ready statuses.
- `report_schedules`: recurring report schedule metadata.
- `alerts`: smart alert records linked to vehicles, customers, exports, invoices, documents, or campaigns.
- `tasks`: assignable operational tasks, optionally generated from alerts or chat.
- `task_comments`: task activity notes.
- `reminders`: due-date records used by alerts and tasks.
- `chat_threads`: team, branch, vehicle, customer, export, support, and AI thread metadata.
- `chat_participants`: thread membership.
- `chat_messages`: text messages with entity links.
- `chat_attachments`: file metadata for messages.

All new tenant tables include `company_id`, optional `branch_id`, creator/updater columns, timestamps, and soft delete where business records need retention.

## Permissions And RLS

- Reports require `view_reports`.
- Report exports and schedules require `view_reports`; management is limited to report owners or company admins.
- Alerts, tasks, reminders, and chat require active company membership plus branch access.
- Audit log viewer requires `view_audit_logs`.
- RLS remains the enforcement layer; frontend filtering is only convenience.
- All new public tables receive explicit authenticated grants and RLS policies.

## Server Behavior

- Report summaries are computed server-side from existing tenant tables.
- Report export requests store filter metadata and result summary; CSV download can be added from the same saved query definitions in the export integration phase.
- Smart alert actions can assign a task, snooze, resolve, and notify a user.
- Chat can create a task from a thread message.
- Notification actions can mark records read.
- Every mutation writes `audit_logs`.

## UI

- `/reports`: KPI cards, saved reports, report exports, report schedule form, CSV export request form, and tables for inventory/sales/export/marketing summary.
- `/operations/alerts`: smart alert queue, task board, reminder list, create/assign/resolve/snooze controls.
- `/chat`: chat thread list, message timeline, new thread/message forms, create task from chat.
- `/settings/audit-logs`: filterable recent audit log table.

## Testing

- pgTAP verifies RLS is enabled, seed records exist, tenant isolation works, alert resolution works, and chat visibility is company-scoped.
- Vitest covers report summary calculations, alert priority formatting, task status helpers, and chat preview formatting.
- Playwright extends the workspace smoke flow to create a report export, resolve an alert, send a chat message, and view audit logs.

## Limits

- No external email, WhatsApp, or push provider is integrated in this phase.
- PDF and Excel export records are stored but actual binary generation remains a future integration.
- Chat attachments store metadata only; secure binary upload can reuse Phase 7 document storage in the attachment integration phase.

# Phase 10 Reports Alerts Chat

Phase 10 adds the final planned production foundation for reports, analytics, smart alerts, notifications, chat, and audit visibility.

## Implemented

- Reports dashboard at `/reports`.
- Saved reports, export requests, and report schedules.
- Smart alerts, tasks, task comments, and reminders.
- Notification center actions using the existing `notifications` table.
- Chat center at `/chat` with team, branch, vehicle, customer, export, support, and AI thread types.
- Audit log viewer at `/settings/audit-logs`.
- RLS and permission-aware server actions.
- Unit, pgTAP, and E2E coverage for the operations workflow.

## Security Notes

- Reports require `view_reports`.
- Audit logs require `view_audit_logs`.
- Alerts, tasks, reminders, and chat are tenant-scoped and branch-aware.
- Mutations write audit logs.
- External email, WhatsApp, push, and binary chat attachments are integration-ready but not connected in this phase.
- PDF and Excel export rows are stored as workflow records; CSV is the active first export format.

## Verification

Run:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```

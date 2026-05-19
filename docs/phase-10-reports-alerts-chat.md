# Phase 10 Reports Alerts Chat

Phase 10 adds the final planned production foundation for reports, analytics, smart alerts, notifications, chat, and audit visibility.

## Planned

- Reports dashboard.
- Saved reports, export requests, and report schedules.
- Smart alerts, tasks, task comments, and reminders.
- Notification center actions using the existing `notifications` table.
- Chat center with team, branch, vehicle, customer, export, support, and AI thread types.
- Audit log viewer.
- RLS and permission-aware server actions.

## Security Notes

- Reports require `view_reports`.
- Audit logs require `view_audit_logs`.
- Alerts, tasks, reminders, and chat are tenant-scoped and branch-aware.
- Mutations write audit logs.
- External email, WhatsApp, push, and binary chat attachments are integration-ready but not connected in this phase.

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

# Phase 14: Communications Provider Layer

Phase 14 adds communications channel settings, template manager, and consent verification rules to the CRM Leads module.

## Included

- Provider settings registry (WhatsApp Cloud API, SMTP gateway, Twilio SMS)
- Message template compiler with variable interpolation using double curly braces: `{{variable}}`
- Customer outreach consent manager (enforces Opt-In requirements per channel)
- Outbound messages queue and logs
- Delivery event logs tracker (queued, sent, delivered, read, failed)
- RLS policies and trigger constraints preventing unauthorized outreach
- pgTAP database validation, Vitest unit coverage, and Playwright E2E integration

## Supabase Tables

- `communication_providers`
- `message_templates`
- `customer_consents`
- `outbound_messages`
- `message_delivery_events`

Every table includes company ownership, branch scope where needed, indexes, grants, and RLS.

## Permission Model

Phase 14 uses `manage_communications`. Only users with this permission can register providers and add/edit message templates. CRM leads viewing, consent toggles, and outreach draft generation are available to standard sales roles with lead-editing capabilities.

## Provider & Consent Architecture

The current implementation is simulated/provider-ready. Future adapters can listen to `outbound_messages` status changes, dispatch via Twilio/Meta/SendGrid, and register updates back into `message_delivery_events`.

### Business Rules

- Only one active provider is allowed per type (`whatsapp`, `email`, `sms`) per company.
- Templates are channel-scoped and support custom variables in body content.
- Database trigger `trg_verify_outreach_consent` blocks dispatch approvals (`approveAndSendOutboundMessage`) if no active opt-in consent exists for the recipient/channel.
- Sending a message automatically creates the corresponding logs in `lead_messages` to ensure lead activities remain fully unified.

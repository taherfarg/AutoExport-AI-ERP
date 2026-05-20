# Phase 15: Stripe Billing and SaaS Usage Enforcement Design

## Goal

Turn AutoSphere ERP subscription management from a package display into a production SaaS billing control plane. The system should be Stripe-ready, local-gateway-ready later, and able to enforce package limits without relying on frontend-only checks.

## Scope

- Stripe customer mapping per company.
- Hosted Checkout Session creation for package upgrades and new paid subscriptions.
- Hosted Customer Portal Session creation for billing management.
- Stripe webhook endpoint with raw-body signature verification and idempotent event logging.
- Billing event ledger for subscription lifecycle events.
- Usage counters for branches, users, vehicles, listings, AI requests, export orders, and storage placeholders.
- Usage limit events when a company reaches or exceeds a package limit.
- Subscription page upgrade UX with package comparison and locked-module guidance.

## Non-Goals

- Full tax/VAT filing.
- Local GCC payment gateway integration.
- Metered Stripe usage billing.
- In-app card collection. Billing must remain hosted by Stripe for PCI scope reduction.

## Data Model

### `billing_customers`

Maps one AutoSphere company to one Stripe customer.

Key columns:
- `company_id`
- `provider`
- `provider_customer_id`
- `billing_email`
- `billing_name`
- `status`
- `metadata`

### `billing_events`

Stores provider webhook and server-side billing events for auditability and idempotency.

Key columns:
- `company_id`
- `provider`
- `provider_event_id`
- `event_type`
- `event_status`
- `payload`
- `processed_at`
- `error_message`

### `usage_counters`

Stores package usage by period and metric.

Key columns:
- `company_id`
- `metric_key`
- `period_start`
- `period_end`
- `current_value`
- `limit_value`
- `source_table`
- `refreshed_at`

### `usage_limit_events`

Stores limit warning/blocking events.

Key columns:
- `company_id`
- `metric_key`
- `event_type`
- `current_value`
- `limit_value`
- `entity_type`
- `entity_id`
- `message`

## Permissions

Use the existing `manage_subscriptions` permission for billing management. Add `view_billing` for users who can see billing health without creating portal or checkout sessions.

Rules:
- Company members with `view_billing` or `manage_subscriptions` can view billing status and usage.
- Only users with `manage_subscriptions` can create checkout or portal sessions, change package intent, or refresh usage counters.
- Webhook processing uses server-side service-role access and must filter/update by `company_id`.

## Stripe Integration Shape

Use Stripe hosted flows:
- Checkout Session: `mode=subscription`, `success_url`, `cancel_url`, package metadata.
- Customer Portal Session: created on demand for existing Stripe customers.
- Webhook endpoint: verifies `Stripe-Signature` against `STRIPE_WEBHOOK_SECRET` using the raw request body.

Supported webhook events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

When Stripe is not configured in local development, actions should return a deterministic simulated URL and write a billing event with `provider='manual'`. This keeps development and E2E stable without hiding the production integration path.

## Usage Metrics

Initial metrics:
- `branches`
- `users`
- `vehicles`
- `ai_requests`
- `marketing_listings`
- `export_orders`
- `storage_mb`

Package limits already exist for branches, users, vehicles, and AI requests. Missing package limits should be treated as unlimited until Phase 15 or a later billing settings phase adds explicit columns.

## Enforcement Strategy

Phase 15 adds backend usage checks and visible warnings. It does not yet block every create action globally because that requires touching many mature workflows. New shared helpers should be used by later phases to block creates before insert.

Immediate enforcement:
- Subscription page shows warnings for exceeded limits.
- Manual usage refresh records `usage_limit_events`.
- Server actions can call `assertUsageAllowed` before creating new limited entities.

## Security Notes

- Stripe secret keys stay server-only.
- Never expose webhook secrets or service-role keys.
- Webhook processing must be idempotent on `provider_event_id`.
- All billing management actions write audit logs.
- Public billing tables must have RLS enabled.

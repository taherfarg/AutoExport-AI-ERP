# Phase 15: Stripe Billing and SaaS Usage Enforcement Plan

## Objective

Build the production billing foundation for AutoSphere ERP: Stripe-ready checkout and portal flows, webhook event processing, billing customer records, usage counters, usage limit events, subscription upgrade UX, RLS, tests, and documentation.

## Tasks

### 1. Schema and Security

- Create a Supabase migration with billing tables:
  - `billing_customers`
  - `billing_events`
  - `usage_counters`
  - `usage_limit_events`
- Add billing enums for provider/status/event types.
- Add `view_billing` permission and grant it to system roles.
- RLS:
  - `view_billing` or `manage_subscriptions` can select billing rows.
  - `manage_subscriptions` can manage rows.
  - Webhook/server processing uses service role and remains company-scoped.
- Add indexes for company, period, provider event id, and metric lookups.
- Add pgTAP tests for RLS, seed permission, idempotency, and tenant isolation.

### 2. Billing Domain Logic

- Add `lib/billing/usage.ts`:
  - Map package limits to usage metrics.
  - Compute usage percentage.
  - Determine warning/blocking status.
  - Build package checkout metadata.
- Add `lib/billing/stripe.ts`:
  - Create Checkout Sessions through Stripe REST.
  - Create Billing Portal Sessions through Stripe REST.
  - Verify Stripe webhook signatures using raw body HMAC.
  - Provide local simulated URLs when Stripe is not configured.
- Add unit tests for limit calculation, metadata, and webhook signature verification.

### 3. Backend Actions and Routes

- Add `features/billing/queries.ts`.
- Add `features/billing/actions.ts`:
  - Refresh usage counters.
  - Create or update billing customer.
  - Create checkout session.
  - Create customer portal session.
- Add `app/api/billing/webhook/route.ts`:
  - Verify signature when configured.
  - Store events idempotently.
  - Update `subscriptions` and `billing_customers` from known event shapes.

### 4. UI

- Upgrade `app/(app)/subscriptions/page.tsx`:
  - Current package and subscription status.
  - Billing customer panel.
  - Usage counters and warnings.
  - Package comparison.
  - Checkout and portal action buttons.
  - Locked-module upgrade guidance.
- Add small client action form components for visible success/error feedback.

### 5. Tests and Docs

- Add unit coverage for billing logic.
- Extend E2E flow to visit subscriptions, refresh usage, create a simulated checkout URL, and create a billing portal URL.
- Update README and `.env.example`.
- Run full verification:
  - `npm run lint`
  - `npm run test`
  - `npx tsc --noEmit`
  - `npm run build`
  - `npx supabase db reset`
  - `npx supabase test db`
  - `npm run test:e2e`

## Acceptance Criteria

- Billing state is tenant-isolated by RLS.
- Stripe secrets are validated server-side only and never exposed in public payloads.
- Subscription page can manage billing in local development without real Stripe keys.
- Webhook endpoint rejects invalid signatures when a webhook secret is configured.
- Usage counters expose warning/blocking states for package limits.
- All verification commands pass.

# Phase 13: Website & Marketplace Sync Design

## Goal

Add production-ready marketplace publishing control to AutoSphere ERP without connecting live external APIs yet. Dealers should be able to prepare channel-specific inventory publishing, track sync jobs, inspect sync errors, override listing prices per channel, and capture marketplace leads into the CRM pipeline.

## Scope

Phase 13 extends the existing Marketing & Listings module. It does not remove or replace Phase 8 listings, campaigns, social drafts, content calendar, or lead-source metrics.

Included:

- Marketplace channel registry for website, Dubizzle, AutoTrader, Facebook Marketplace, Instagram, export portals, and custom channels.
- Channel-specific price overrides for existing marketing listings.
- Listing sync jobs with queued, running, completed, failed, and cancelled states.
- Listing sync logs with severity and external reference metadata.
- Marketplace lead capture records linked to listings, vehicles, channels, and converted CRM leads.
- Server-side actions with permission checks and audit logs.
- Marketing page UI sections for sync control, price overrides, logs, and lead capture.
- RLS and pgTAP coverage for tenant isolation.
- Unit tests for marketplace status summaries and payload generation.

Out of scope:

- Live Dubizzle, AutoTrader, Meta, or website API integrations.
- Background job workers.
- Bidirectional stock sync from external platforms.
- Public website storefront rendering.

## Data Model

New tables:

- `marketplace_channels`: company-owned channel configuration and provider metadata.
- `listing_price_overrides`: per-listing, per-channel pricing and publishing notes.
- `listing_sync_jobs`: requested sync operations for a listing/channel pair.
- `listing_sync_logs`: sync job log entries, warnings, and errors.
- `marketplace_leads`: lead captures from marketplace channels before or after CRM conversion.

Each table includes tenant fields, audit fields, soft delete support, indexes, explicit authenticated grants, and RLS.

## Permissions

Phase 13 reuses `manage_marketing`.

- Users with `manage_marketing` can read and manage marketplace channels, overrides, sync jobs/logs, and marketplace leads.
- Existing branch access applies where a row is branch-scoped.
- Server actions also call the current permission set before using the service-role client.

## UX

The Marketing & Listings page gains a `Marketplace Sync` area:

- Channel cards show active providers and whether they are website, marketplace, social, or export portal channels.
- A price override form lets marketing managers set channel-specific price and publication notes.
- A sync job form queues a publish/update/unpublish sync request.
- Sync logs display latest results and errors.
- A marketplace lead form captures incoming buyer inquiries and can later be converted into CRM leads.

The UI remains operational and manual-first while provider adapters are added later.

## Business Rules

- A sync job must reference a valid company listing and marketplace channel.
- Channel price overrides must be non-negative and unique per listing/channel.
- Marketplace leads must include at least name or phone/email/WhatsApp.
- Creating a marketplace lead increments the related marketing listing lead count.
- Sensitive publish-control actions create audit log entries.
- External provider payloads are stored as JSONB so future adapters can persist raw responses.

## Testing

- Unit tests cover channel payload generation, status summary, and lead contact validation.
- pgTAP tests verify RLS, permission presence, tenant isolation, insert/update behavior, and listing lead-count sync.
- E2E extends the existing workspace flow to create an override, queue a sync job, create a log, and capture a marketplace lead.

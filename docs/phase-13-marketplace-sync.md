# Phase 13: Website & Marketplace Sync

Phase 13 adds provider-ready website and marketplace publishing control to the Marketing & Listings module.

## Included

- Marketplace channel registry
- Channel-specific listing price overrides
- Listing sync jobs for publish, update, unpublish, and refresh operations
- Listing sync logs for provider responses, warnings, and errors
- Marketplace lead capture linked to listings, vehicles, and channels
- Tenant-isolated Supabase RLS policies
- pgTAP, unit, and E2E coverage

## Supabase Tables

- `marketplace_channels`
- `listing_price_overrides`
- `listing_sync_jobs`
- `listing_sync_logs`
- `marketplace_leads`

Every table includes company ownership, branch scope where needed, soft-delete support, indexes, grants, and RLS.

## Permission Model

Phase 13 uses `manage_marketing`. Server actions still validate the current workspace and permission before using the service-role client.

## Provider Architecture

The current implementation is manual/provider-ready. Future adapters can process `listing_sync_jobs`, send `requested_payload` to providers, and write results into `listing_sync_logs`.

Initial provider-ready channels include:

- Website Inventory
- Dubizzle
- AutoTrader
- Facebook Marketplace
- Instagram Shop
- Export Portal

## Business Rules

- Price overrides are unique per listing and marketplace channel.
- Sync jobs must reference a valid listing and channel in the same company.
- Marketplace leads require phone, WhatsApp, or email.
- Capturing a marketplace lead increments the related listing lead count.
- Publish-control actions create audit logs.

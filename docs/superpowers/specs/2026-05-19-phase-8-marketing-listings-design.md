# Phase 8 Marketing And Listings Design

## Scope

Phase 8 builds the operational marketing foundation for AutoSphere ERP. It turns vehicle inventory into channel-ready listing records, social media draft posts, campaign tracking, content calendar entries, and lead source performance. Real Meta/WhatsApp/website integrations remain later; this phase creates the production data model and manual workflow that those integrations will plug into.

## Production Outcomes

- Marketing dashboard for active listings, scheduled content, published posts, campaign spend, and lead-source performance.
- Website listing records linked to vehicles and branches.
- Listing channel definitions for website, Instagram, Facebook, TikTok, LinkedIn, WhatsApp, marketplace, and export portal.
- Social post drafts for captions, WhatsApp broadcasts, short scripts, and manual publish status.
- Campaign records with budget, spend, date range, channel, and status.
- Content calendar entries that schedule posts/listings/campaign work.
- Lead source definitions and manual performance metrics.
- Server-side permission checks using `manage_marketing`; company members with marketing access see tenant-scoped rows only.

## Database Design

New enums:

- `marketing_listing_status`
- `marketing_channel_type`
- `social_post_status`
- `campaign_status`
- `content_calendar_status`

New tables:

- `listing_channels`: company channel configuration and UTM/source metadata.
- `marketing_listings`: vehicle listing records with generated customer-facing content.
- `social_posts`: channel-specific social drafts linked to vehicles/listings/campaigns.
- `campaigns`: campaign planning and performance rollups.
- `content_calendar`: scheduled marketing work.
- `lead_sources`: company lead source definitions and manual metrics.

Tenant-owned tables include `company_id`, branch where applicable, creator/updater fields, timestamps, and soft delete where records are operational history.

## Business Rules

- A listing must belong to one vehicle in the same company.
- Listing price and currency default from the selected vehicle when created.
- Creating a listing updates the vehicle website/social status fields.
- Social posts can be created from a vehicle or listing and start as `draft`.
- Publishing is manual in this phase; the system stores the external URL/reference if entered.
- Campaign metrics are manual first: budget, spend, impressions, clicks, leads, and conversions.
- Marketing source performance can be tracked without requiring external APIs.

## UI

Route: `/marketing/listings`

Sections:

- KPI cards for active listings, draft posts, scheduled posts, active campaigns, lead-source count, and campaign spend.
- Listing table with vehicle, channel, status, price, and lead count.
- Create listing form from inventory vehicles.
- Social draft form with caption/script/body by channel.
- Campaign form and active campaign cards.
- Content calendar list.
- Lead source performance panel.

The page should feel like an operator dashboard, not a landing page: dense, clean tables, compact forms, status badges, and clear action buttons.

## Tests

- pgTAP verifies table existence, RLS, permissions, tenant isolation, and listing-trigger behavior.
- Vitest covers listing content generation, campaign KPI math, status formatting, and Zod validation.
- Playwright extends the full workspace flow to create a listing, social post draft, campaign, and lead source performance row.

## Non-Goals

- No automatic posting to Meta, TikTok, LinkedIn, or WhatsApp yet.
- No AI-generated copy yet; helper-generated drafts are deterministic until the AI phase.
- No media asset generation pipeline yet.

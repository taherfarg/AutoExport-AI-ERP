# Phase 12 VIN, Valuation & Vehicle Intelligence Design

## Scope

Phase 12 adds DMS-grade vehicle intelligence to AutoSphere ERP. The first production slice focuses on safer inventory entry, VIN enrichment history, market valuation records, competitor pricing, and vehicle history report placeholders. It does not integrate a paid VIN or valuation provider yet; it creates the provider-ready architecture and useful manual workflows.

## Production Outcomes

- Duplicate VIN and stock number checks remain enforced per company.
- Vehicle create page surfaces existing validation errors instead of crashing.
- VIN decoder request records are stored per company, vehicle, provider, status, payload, and requester.
- Manual VIN decode fallback can save decoded fields when an external provider is not configured.
- Market valuation records store low/average/high market price, confidence, provider metadata, and recommended listing price.
- Competitor price records store channel, seller, URL, price, currency, mileage, location, observed date, and notes.
- Vehicle history report records store provider/status/report URL/risk summary/accident/odometer/ownership signals.
- Vehicle enrichment logs provide an audit-style timeline for decode, valuation, history, and competitor intelligence.
- Vehicle detail and smart pricing pages show intelligence panels.

## Database Design

New enums:

- `vehicle_intelligence_provider_status`
- `vehicle_enrichment_event_type`
- `vehicle_history_report_status`

New tables:

- `vin_decode_requests`
- `vehicle_market_values`
- `vehicle_competitor_prices`
- `vehicle_history_reports`
- `vehicle_enrichment_logs`

Every table includes `company_id`, optional `branch_id`, `vehicle_id` where applicable, creator/updater metadata, timestamps, soft delete where records may be superseded, indexes, grants, and RLS.

## Business Rules

- VIN and stock number remain unique per company.
- VIN decode requests are tenant-scoped and must never expose another company vehicle.
- Manual decode can populate a request result without changing the vehicle directly.
- Market valuation snapshots never overwrite selling price automatically.
- Recommended price can be copied into pricing scenarios later, but Phase 12 keeps it advisory.
- Competitor price records can be archived without deleting history.
- Vehicle history report risk data is visible to vehicle viewers, while any future paid report files will require document/storage permissions.

## UI

Vehicle details adds an "Intelligence" section with:

- Latest VIN decode status and decoded summary.
- Latest market valuation and recommended price.
- Competitor price comparison table.
- Vehicle history report summary.
- Enrichment timeline.
- Forms for manual VIN decode, market valuation, competitor price, and history report placeholder.

Smart pricing adds valuation context:

- Market average.
- Recommended listing price.
- Competitor count.
- Pricing notes from latest intelligence records.

## Tests

- pgTAP validates new tables, grants, RLS, seed records, and tenant isolation.
- Vitest validates VIN normalization, VIN duplicate messages, valuation calculations, recommendation bounds, and enrichment summaries.
- Playwright extends the workspace flow to add VIN intelligence to a created vehicle and verify it appears on the vehicle detail/pricing pages.

## Non-Goals

- No paid VIN provider integration yet.
- No automatic vehicle overwrite from decoded values.
- No automatic price update without manager approval.
- No external marketplace scraping.
- No paid vehicle history report purchase flow.

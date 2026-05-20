# Phase 12: VIN, Valuation, and Vehicle Intelligence

Phase 12 adds the vehicle intelligence layer used by inventory and smart pricing.

## Included

- Manual/provider-ready VIN decode records
- Market valuation records by country and currency
- Competitor price tracking
- Vehicle history report placeholders
- Enrichment timeline logs
- `manage_vehicle_intelligence` permission
- Tenant-isolated RLS policies and pgTAP coverage
- Vehicle detail UI for intelligence records
- Smart Pricing market-intelligence defaults

## Supabase Tables

- `vin_decode_requests`
- `vehicle_market_values`
- `vehicle_competitor_prices`
- `vehicle_history_reports`
- `vehicle_enrichment_logs`

Every table includes `company_id`, branch/vehicle links where applicable, soft-delete support, authenticated grants, RLS policies, and indexes for tenant and vehicle lookups.

## Permission Model

Users with `view_vehicles` can read intelligence records for vehicles they can access. Users with `manage_vehicle_intelligence` can add VIN decode, valuation, competitor, and history records. The seed migration grants this permission to owners, super admins, general managers, and inventory managers.

## Provider Roadmap

The current phase stores real records and supports manual entry. External provider adapters can be added later for:

- VIN decoder APIs
- Market valuation providers
- Vehicle history reports
- Marketplace competitor scraping or sync

Provider calls should write raw payloads into the intelligence tables and append `vehicle_enrichment_logs` for auditability.

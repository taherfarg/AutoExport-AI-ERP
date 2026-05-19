# Phase 8 Marketing And Listings

Phase 8 adds the marketing operations foundation for AutoSphere ERP.

## Planned

- Website and marketplace listing records.
- Channel definitions for website, Instagram, Facebook, TikTok, LinkedIn, WhatsApp, marketplace, and export portal.
- Social media draft posts.
- Campaign planning and manual performance tracking.
- Content calendar.
- Lead source performance records.
- Permission-aware RLS and server-side marketing actions.

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

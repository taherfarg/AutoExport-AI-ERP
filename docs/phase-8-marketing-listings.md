# Phase 8 Marketing And Listings

Phase 8 adds the marketing operations foundation for AutoSphere ERP.

## Implemented

- Website and marketplace listing records linked to vehicles.
- Channel definitions for website, Instagram, Facebook, TikTok, LinkedIn, WhatsApp, marketplace, and export portal.
- Social media draft posts for captions, hashtags, calls to action, and scripts.
- Campaign planning and manual performance tracking.
- Content calendar.
- Lead source performance records.
- Permission-aware RLS and server-side marketing actions.
- Vehicle website/social listing status sync triggers.

## Security Notes

- Marketing tables are tenant-owned through `company_id`.
- Branch-scoped rows use `app_private.can_access_branch`.
- RLS and server actions require `manage_marketing`.
- Mutations write audit logs for listings, social posts, and campaigns.

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

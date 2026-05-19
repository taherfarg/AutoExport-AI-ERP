# Phase 9 AI Technical Intelligence

Phase 9 adds the production AI safety and assistant foundation for AutoSphere ERP.

## Implemented

- Permission-aware AI assistant route at `/ai`.
- AI conversations and message history stored per tenant.
- AI requests, answer payloads, tool actions, and audit records.
- Human approval queue for sensitive AI proposals.
- AI report request records.
- AI document extraction request records.
- Server-side AI tool registry with permission filtering.
- Deterministic business tools for stock, leads, payments, documents, pricing, marketing drafts, quotation drafts, follow-up drafts, and report drafts.
- Provider-ready OpenAI path: if `OPENAI_API_KEY` exists, requests are tagged as OpenAI-ready while sensitive business execution still stays server-side and approval-gated.

## Safety Notes

- AI tools must run server-side only.
- AI cannot reveal unauthorized finance/profit data.
- AI cannot mutate sensitive records without approval.
- Sensitive actions create approval records.
- API keys must remain server-only environment variables.
- The first implementation does not let AI directly send customer messages, change prices, record payments, sell vehicles, or generate final invoices.
- External model calls can be added behind the existing server action/provider boundary without changing RLS or approval storage.

## Environment Variables

Optional:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
```

Do not expose these through `NEXT_PUBLIC_` variables.

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

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
- Deterministic business tools for stock, vehicle details, leads, payments, documents, pricing, marketing drafts, quotation drafts, follow-up drafts, and report drafts.
- OpenAI-compatible Responses API provider path for model-assisted tool routing and answer refinement when `OPENAI_API_KEY` exists.
- Deterministic local fallback when no provider key is configured or the provider fails.

## Safety Notes

- AI tools must run server-side only.
- AI cannot reveal unauthorized finance/profit data.
- AI cannot mutate sensitive records without approval.
- Sensitive actions create approval records.
- API keys must remain server-only environment variables.
- AI does not directly send customer messages, change prices, record payments, sell vehicles, or generate final invoices.
- External model calls never bypass RLS or server permission checks; the provider receives only the permitted server-side tool output.

## Environment Variables

Optional:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_BASE_URL=https://api.openai.com/v1
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

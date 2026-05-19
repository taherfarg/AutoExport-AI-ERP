# Phase 9 AI Technical Intelligence

Phase 9 adds the production AI safety and assistant foundation for AutoSphere ERP.

## Planned

- Permission-aware AI assistant.
- AI conversations and message history.
- AI requests and action audit records.
- Human approval queue for sensitive AI proposals.
- AI report request records.
- AI document extraction request records.
- Server-side AI tool registry.
- Optional OpenAI Responses API provider adapter.

## Safety Notes

- AI tools must run server-side only.
- AI cannot reveal unauthorized finance/profit data.
- AI cannot mutate sensitive records without approval.
- Sensitive actions create approval records.
- API keys must remain server-only environment variables.

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

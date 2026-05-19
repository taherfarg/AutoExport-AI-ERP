# Phase 2B Vehicle Documents and Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure vehicle photo/document metadata, storage policies, checklist workflow, and vehicle detail UI.

**Architecture:** Extend the existing vehicle module with a private Supabase Storage bucket and metadata tables. Use server actions to validate workspace/vehicle access, upload files when supplied, insert metadata rows, and refresh vehicle readiness statuses.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Storage, Supabase PostgreSQL/RLS, Zod, pgTAP, Playwright.

---

## Tasks

- [x] Add migration for `vehicle_document_checklists`, storage bucket, storage RLS policies, functions, and seed checklist rows.
- [x] Add SQL tests for bucket, RLS, checklist rows, and storage path isolation.
- [x] Add validation schemas and server actions for photo/document metadata and optional file upload.
- [x] Add vehicle media/checklist queries and signed URL helpers.
- [x] Build photo and document sections on vehicle detail page.
- [x] Extend E2E coverage for adding vehicle document metadata.
- [x] Update docs and run full verification.

## Verification Commands

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```

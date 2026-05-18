# Phase 1 SaaS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production foundation for AutoSphere ERP: Next.js App Router, Supabase Auth, PostgreSQL tenant schema, RLS, company workspaces, branches, roles, permissions, subscriptions, module access, audit logs, seed data, and a secure dashboard shell.

**Architecture:** Use a shared Supabase PostgreSQL database with strict `company_id` tenant isolation enforced by RLS and server-side permission checks. The Next.js app uses Supabase server-side auth cookies, server actions for mutations, Zod validation, and route groups that separate public auth pages from authenticated workspace pages.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, React Hook Form, Zod, TanStack Table, Supabase Auth, Supabase PostgreSQL, Supabase Storage-ready policies, Vitest, Playwright.

---

## Source Documents

- `docs/MASTER_BUILD_PROMPT.md`
- `docs/superpowers/specs/2026-05-18-autosphere-erp-technical-blueprint.md`

Supabase docs to check during execution:

- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Next.js server-side auth: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Storage access control: https://supabase.com/docs/guides/storage/security/access-control

## Scope

This plan implements Phase 1 only:

- Project setup
- Auth
- Supabase connection
- Database schema
- RLS policies
- Companies/workspaces
- Branches
- Users/roles/permissions
- Subscriptions/module access
- Main dashboard shell
- Seed data
- Foundation tests
- README and environment documentation

Vehicle inventory, CRM, sales, export, documents, payments, finance, AI, alerts, chat, and reports are represented in Phase 1 as package/module definitions used for navigation gating. Their business workflows are implemented in their assigned future phases.

## File Structure

Create or modify these files:

```text
.
|-- .env.example
|-- .gitignore
|-- README.md
|-- package.json
|-- next.config.ts
|-- tsconfig.json
|-- postcss.config.mjs
|-- tailwind.config.ts
|-- vitest.config.ts
|-- playwright.config.ts
|-- proxy.ts
|-- app
|   |-- globals.css
|   |-- layout.tsx
|   |-- page.tsx
|   |-- (auth)
|   |   |-- login/page.tsx
|   |   |-- signup/page.tsx
|   |   `-- callback/route.ts
|   |-- (app)
|   |   |-- layout.tsx
|   |   |-- dashboard/page.tsx
|   |   |-- onboarding/company/page.tsx
|   |   |-- settings/company/page.tsx
|   |   |-- settings/branches/page.tsx
|   |   |-- settings/users/page.tsx
|   |   |-- settings/roles/page.tsx
|   |   `-- subscriptions/page.tsx
|   `-- auth/actions.ts
|-- components
|   |-- app-shell/app-sidebar.tsx
|   |-- app-shell/topbar.tsx
|   |-- auth/auth-form.tsx
|   |-- dashboard/kpi-card.tsx
|   `-- ui
|       |-- button.tsx
|       |-- card.tsx
|       |-- input.tsx
|       |-- label.tsx
|       `-- badge.tsx
|-- lib
|   |-- auth/require-user.ts
|   |-- auth/session.ts
|   |-- modules/module-registry.ts
|   |-- permissions/permissions.ts
|   |-- permissions/require-permission.ts
|   |-- supabase/browser.ts
|   |-- supabase/server.ts
|   |-- supabase/service-role.ts
|   |-- validations/company.ts
|   |-- validations/branch.ts
|   `-- utils.ts
|-- features
|   |-- companies/actions.ts
|   |-- companies/queries.ts
|   |-- branches/actions.ts
|   |-- branches/queries.ts
|   |-- users/actions.ts
|   |-- users/queries.ts
|   `-- subscriptions/queries.ts
|-- supabase
|   |-- config.toml
|   |-- migrations
|   |   |-- 20260518081004_phase_1_core_schema.sql
|   |   |-- 20260518121853_phase_1_rls_policies.sql
|   |   `-- 20260518122745_phase_1_seed_data.sql
|   `-- tests
|       `-- phase_1_rls.sql
|-- tests
|   |-- unit/permissions.test.ts
|   |-- unit/module-registry.test.ts
|   `-- e2e/auth-workspace.spec.ts
`-- docs
    `-- phase-1-saas-foundation.md
```

Responsibilities:

- `supabase/migrations`: database tables, indexes, grants, RLS, seed data.
- `lib/supabase`: Supabase clients for browser, server, and service-role server-only work.
- `lib/permissions`: shared permission keys and server permission checks.
- `lib/modules`: module registry used by sidebar and package gating.
- `features/*`: server actions and data access per foundation module.
- `app/(auth)`: login/signup/callback routes.
- `app/(app)`: authenticated workspace UI.
- `components/app-shell`: production shell shared across modules.
- `tests/unit`: pure TypeScript permission and module tests.
- `supabase/tests`: SQL tenant isolation checks.
- `tests/e2e`: browser-level smoke flow.

---

### Task 1: Initialize Repository and Next.js App

**Files:**

- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Initialize git if needed**

Run:

```powershell
if (-not (Test-Path ".git")) { git init }
```

Expected: repository exists and `git status --short` works.

- [ ] **Step 2: Create Next.js app in the current folder**

Run:

```powershell
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir false --import-alias "@/*"
```

Expected: Next.js creates `app`, `package.json`, `tsconfig.json`, and Tailwind config files without nesting the app in a child folder.

- [ ] **Step 3: Install production dependencies**

Run:

```powershell
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers lucide-react recharts @tanstack/react-table @tanstack/react-query clsx tailwind-merge class-variance-authority
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 4: Install development test dependencies**

Run:

```powershell
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom playwright
```

Expected: dev dependencies are added to `package.json`.

- [ ] **Step 5: Replace `.env.example`**

Create `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 6: Replace root page**

Create `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
```

- [ ] **Step 7: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes or only reports issues from generated template files that are fixed in this task.

- [ ] **Step 8: Commit**

Run:

```powershell
git add .
git commit -m "chore: initialize autosphere next app"
```

Expected: commit succeeds.

---

### Task 2: Configure shadcn/ui Foundation Components

**Files:**

- Create: `components/ui/button.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/label.tsx`
- Create: `components/ui/badge.tsx`
- Create: `lib/utils.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Initialize shadcn/ui**

Run:

```powershell
npx shadcn@latest init
```

Choose:

```text
Style: New York
Base color: Slate
CSS variables: yes
```

Expected: `components.json` is created.

- [ ] **Step 2: Add base UI components**

Run:

```powershell
npx shadcn@latest add button card input label badge
```

Expected: UI component files exist under `components/ui`.

- [ ] **Step 3: Confirm `lib/utils.ts` contains cn helper**

Expected content:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Update global design tokens**

Update `app/globals.css` so the body uses shadcn variables:

```css
body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 6: Commit**

Run:

```powershell
git add components lib app/globals.css components.json
git commit -m "chore: add ui foundation"
```

Expected: commit succeeds.

---

### Task 3: Add Supabase Local Configuration

**Files:**

- Create: `supabase/config.toml`

- [ ] **Step 1: Check Supabase CLI**

Run:

```powershell
supabase --version
supabase --help
```

Expected: CLI prints a version and help text.

- [ ] **Step 2: Initialize Supabase config**

Run:

```powershell
supabase init
```

Expected: `supabase/config.toml` exists.

- [ ] **Step 3: Start local Supabase**

Run:

```powershell
supabase start
```

Expected: local API URL, anon/publishable key, service role key, and DB URL are printed.

- [ ] **Step 4: Copy local values into `.env.local`**

Create `.env.local` using the local values printed by `supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=copy-the-local-publishable-or-anon-key-printed-by-supabase-start
SUPABASE_SERVICE_ROLE_KEY=copy-the-local-service-role-key-printed-by-supabase-start
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Expected: `.env.local` exists and remains untracked.

- [ ] **Step 5: Commit config only**

Run:

```powershell
git add supabase/config.toml .env.example
git commit -m "chore: configure supabase local development"
```

Expected: `.env.local` is not committed.

---

### Task 4: Create Phase 1 Core Schema Migration

**Files:**

- Create: `supabase/migrations/20260518081004_phase_1_core_schema.sql`

- [ ] **Step 1: Create migration file with Supabase CLI**

Run:

```powershell
supabase migration new phase_1_core_schema
```

Expected: Supabase creates a timestamped migration file. Rename only if necessary to match the plan and keep one migration for this task.

- [ ] **Step 2: Add extensions, schemas, enums, tables, indexes, and triggers**

Add this SQL to the migration:

```sql
create extension if not exists "pgcrypto";
create schema if not exists app_private;

create type public.company_status as enum ('active', 'suspended', 'trial', 'cancelled');
create type public.member_status as enum ('invited', 'active', 'disabled');
create type public.branch_status as enum ('active', 'inactive');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled');
create type public.audit_severity as enum ('info', 'warning', 'critical');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  logo_url text,
  primary_country_code char(2) not null default 'AE',
  primary_currency_code char(3) not null default 'AED',
  default_language text not null default 'en',
  timezone text not null default 'Asia/Dubai',
  status public.company_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  preferred_language text not null default 'en',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  code text not null,
  country_code char(2) not null default 'AE',
  city text not null,
  address text,
  phone text,
  email text,
  currency_code char(3) not null default 'AED',
  timezone text not null default 'Asia/Dubai',
  is_head_office boolean not null default false,
  status public.branch_status not null default 'active',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, code)
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.member_status not null default 'active',
  joined_at timestamptz,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, profile_id)
);

create table public.branch_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, profile_id)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  is_core boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  name text not null,
  description text not null,
  monthly_price numeric(12,2),
  currency_code char(3) not null default 'USD',
  max_branches integer,
  max_users integer,
  max_vehicles integer,
  max_ai_requests integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.package_modules (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (package_id, module_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  billing_customer_id text,
  billing_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  action_key text not null,
  permission_key text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  role_key text not null,
  description text not null,
  scope text not null default 'company',
  is_system_role boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, role_key)
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  branding jsonb not null default '{}'::jsonb,
  localization jsonb not null default '{}'::jsonb,
  invoice_settings jsonb not null default '{}'::jsonb,
  security_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branch_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null unique references public.branches(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  severity public.audit_severity not null default 'info',
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger branches_set_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger company_memberships_set_updated_at before update on public.company_memberships for each row execute function public.set_updated_at();
create trigger branch_memberships_set_updated_at before update on public.branch_memberships for each row execute function public.set_updated_at();
create trigger packages_set_updated_at before update on public.packages for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger company_settings_set_updated_at before update on public.company_settings for each row execute function public.set_updated_at();
create trigger branch_settings_set_updated_at before update on public.branch_settings for each row execute function public.set_updated_at();

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_auth_user();

create index companies_status_idx on public.companies(status);
create index branches_company_id_idx on public.branches(company_id);
create index branches_company_status_idx on public.branches(company_id, status);
create index profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index company_memberships_company_profile_idx on public.company_memberships(company_id, profile_id);
create index company_memberships_profile_status_idx on public.company_memberships(profile_id, status);
create index branch_memberships_company_branch_profile_idx on public.branch_memberships(company_id, branch_id, profile_id);
create index subscriptions_company_id_idx on public.subscriptions(company_id);
create index roles_company_id_idx on public.roles(company_id);
create index user_roles_company_profile_idx on public.user_roles(company_id, profile_id) where deleted_at is null;
create index notifications_profile_unread_idx on public.notifications(profile_id, read_at) where deleted_at is null;
create index audit_logs_company_created_idx on public.audit_logs(company_id, created_at desc);
```

- [ ] **Step 3: Reset local DB**

Run:

```powershell
supabase db reset
```

Expected: migration applies without SQL errors.

- [ ] **Step 4: Commit**

Run:

```powershell
git add supabase/migrations
git commit -m "feat: add phase 1 core schema"
```

Expected: commit succeeds.

---

### Task 5: Add RLS Helper Functions and Policies

**Files:**

- Create: `supabase/migrations/20260518121853_phase_1_rls_policies.sql`

- [ ] **Step 1: Create migration file**

Run:

```powershell
supabase migration new phase_1_rls_policies
```

Expected: a new migration file exists.

- [ ] **Step 2: Add helper functions and grants**

Add this SQL:

```sql
create or replace function app_private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = (select auth.uid())
  limit 1
$$;

create or replace function app_private.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = target_company_id
      and cm.profile_id = app_private.current_profile_id()
      and cm.status = 'active'
  )
$$;

create or replace function app_private.can_access_branch(target_company_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_branch_id is null
    or exists (
      select 1
      from public.branch_memberships bm
      where bm.company_id = target_company_id
        and bm.branch_id = target_branch_id
        and bm.profile_id = app_private.current_profile_id()
        and bm.status = 'active'
    )
    or app_private.has_company_permission(target_company_id, 'manage_company_settings')
$$;

create or replace function app_private.has_company_permission(target_company_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.company_id = target_company_id
      and ur.profile_id = app_private.current_profile_id()
      and ur.deleted_at is null
      and p.permission_key = target_permission_key
  )
$$;

revoke all on schema app_private from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
```

- [ ] **Step 3: Add RLS policies**

Add this SQL after the helper functions:

```sql
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.company_memberships enable row level security;
alter table public.branch_memberships enable row level security;
alter table public.modules enable row level security;
alter table public.packages enable row level security;
alter table public.package_modules enable row level security;
alter table public.subscriptions enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.company_settings enable row level security;
alter table public.branch_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self" on public.profiles
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create policy "companies_select_member" on public.companies
  for select to authenticated
  using (app_private.is_company_member(id));

create policy "companies_insert_authenticated" on public.companies
  for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "companies_update_admin" on public.companies
  for update to authenticated
  using (app_private.has_company_permission(id, 'manage_company_settings'))
  with check (app_private.has_company_permission(id, 'manage_company_settings'));

create policy "company_memberships_select_member" on public.company_memberships
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "company_memberships_manage_users" on public.company_memberships
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "branches_select_member" on public.branches
  for select to authenticated
  using (app_private.is_company_member(company_id) and deleted_at is null);

create policy "branches_manage_company_settings" on public.branches
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_company_settings'))
  with check (app_private.has_company_permission(company_id, 'manage_company_settings'));

create policy "branch_memberships_select_member" on public.branch_memberships
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "branch_memberships_manage_users" on public.branch_memberships
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "modules_select_authenticated" on public.modules
  for select to authenticated
  using (true);

create policy "packages_select_authenticated" on public.packages
  for select to authenticated
  using (true);

create policy "package_modules_select_authenticated" on public.package_modules
  for select to authenticated
  using (true);

create policy "subscriptions_select_member" on public.subscriptions
  for select to authenticated
  using (app_private.is_company_member(company_id) and deleted_at is null);

create policy "subscriptions_manage_subscription" on public.subscriptions
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_subscriptions'))
  with check (app_private.has_company_permission(company_id, 'manage_subscriptions'));

create policy "permissions_select_authenticated" on public.permissions
  for select to authenticated
  using (true);

create policy "roles_select_member" on public.roles
  for select to authenticated
  using (company_id is null or app_private.is_company_member(company_id));

create policy "roles_manage_users" on public.roles
  for all to authenticated
  using (company_id is not null and app_private.has_company_permission(company_id, 'manage_users'))
  with check (company_id is not null and app_private.has_company_permission(company_id, 'manage_users'));

create policy "role_permissions_select_member" on public.role_permissions
  for select to authenticated
  using (company_id is null or app_private.is_company_member(company_id));

create policy "user_roles_select_member" on public.user_roles
  for select to authenticated
  using (app_private.is_company_member(company_id) and deleted_at is null);

create policy "user_roles_manage_users" on public.user_roles
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "company_settings_select_member" on public.company_settings
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "company_settings_manage" on public.company_settings
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_company_settings'))
  with check (app_private.has_company_permission(company_id, 'manage_company_settings'));

create policy "branch_settings_select_member" on public.branch_settings
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and profile_id = app_private.current_profile_id()
    and deleted_at is null
  );

create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using (company_id is not null and app_private.has_company_permission(company_id, 'view_audit_logs'));
```

- [ ] **Step 4: Reset local DB**

Run:

```powershell
supabase db reset
```

Expected: migrations apply without SQL errors.

- [ ] **Step 5: Commit**

Run:

```powershell
git add supabase/migrations
git commit -m "feat: add phase 1 rls policies"
```

Expected: commit succeeds.

---

### Task 6: Add Seed Data

**Files:**

- Create: `supabase/migrations/20260518122745_phase_1_seed_data.sql`

- [ ] **Step 1: Create seed migration**

Run:

```powershell
supabase migration new phase_1_seed_data
```

Expected: a seed migration file exists.

- [ ] **Step 2: Add modules, packages, and permissions**

Add this SQL:

```sql
insert into public.modules (module_key, name, description, sort_order, is_core) values
('dashboard', 'Dashboard', 'Company KPIs and operational overview.', 10, true),
('vehicles', 'Vehicle Inventory', 'Manage stock, vehicle status, costs, and branch movement.', 20, true),
('global_stock', 'Global Stock', 'View stock across branches and countries.', 30, false),
('crm', 'Sales CRM', 'Manage customers, leads, follow-ups, and opportunities.', 40, false),
('sales', 'Sales', 'Manage quotations, reservations, proformas, invoices, and payments.', 50, false),
('export', 'Import & Export', 'Manage export orders, import orders, shipping, and customs.', 60, false),
('documents', 'Documents', 'Manage secure vehicle, customer, and sales documents.', 70, false),
('finance', 'Finance Lite', 'Manage vehicle costing, receivables, payables, and profit.', 80, false),
('marketing', 'Marketing & Listings', 'Manage listings, campaigns, and social content.', 90, false),
('ai', 'AI Technical Intelligence', 'Permission-aware AI assistant and automation.', 100, false),
('reports', 'Reports', 'Inventory, sales, export, finance, and branch reports.', 110, false),
('settings', 'Settings', 'Company, branch, user, role, and subscription settings.', 120, true);

insert into public.packages (package_key, name, description, monthly_price, currency_code, max_branches, max_users, max_vehicles, max_ai_requests) values
('starter', 'Starter', 'For small car showrooms.', 49, 'USD', 1, 3, 100, 100),
('showroom_pro', 'Showroom Pro', 'For active car dealers.', 149, 'USD', 3, 10, 500, 1000),
('export_business', 'Export Business', 'For import/export dealers.', 299, 'USD', 10, 25, 2000, 3000),
('enterprise_dealer_group', 'Enterprise Dealer Group', 'For multi-branch dealer groups.', 799, 'USD', null, null, null, 10000);

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key in ('dashboard', 'vehicles', 'crm', 'reports', 'settings')
where p.package_key = 'starter';

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key in ('dashboard', 'vehicles', 'global_stock', 'crm', 'sales', 'documents', 'marketing', 'ai', 'reports', 'settings')
where p.package_key = 'showroom_pro';

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key in ('dashboard', 'vehicles', 'global_stock', 'crm', 'sales', 'export', 'documents', 'finance', 'marketing', 'ai', 'reports', 'settings')
where p.package_key = 'export_business';

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
cross join public.modules m
where p.package_key = 'enterprise_dealer_group';

insert into public.permissions (module_key, action_key, permission_key, description) values
('vehicles', 'view', 'view_vehicles', 'View vehicle inventory.'),
('vehicles', 'create', 'create_vehicle', 'Create vehicles.'),
('vehicles', 'update', 'update_vehicle', 'Update vehicles.'),
('vehicles', 'delete', 'delete_vehicle', 'Archive vehicles.'),
('vehicles', 'view_cost', 'view_vehicle_cost', 'View landed cost.'),
('vehicles', 'view_profit', 'view_vehicle_profit', 'View profit and margin.'),
('sales', 'create_quotation', 'create_quotation', 'Create quotations.'),
('sales', 'approve_discount', 'approve_discount', 'Approve discounts.'),
('sales', 'reserve_vehicle', 'reserve_vehicle', 'Reserve vehicles.'),
('sales', 'create_invoice', 'create_invoice', 'Create invoices.'),
('sales', 'record_payment', 'record_payment', 'Record payments.'),
('export', 'manage', 'manage_exports', 'Manage import/export operations.'),
('documents', 'upload', 'upload_documents', 'Upload documents.'),
('documents', 'verify', 'verify_documents', 'Verify documents.'),
('marketing', 'manage', 'manage_marketing', 'Manage marketing listings and campaigns.'),
('reports', 'view', 'view_reports', 'View reports.'),
('finance', 'view', 'view_finance', 'View finance data.'),
('settings', 'manage_users', 'manage_users', 'Manage users and roles.'),
('settings', 'manage_subscriptions', 'manage_subscriptions', 'Manage subscriptions.'),
('settings', 'manage_company_settings', 'manage_company_settings', 'Manage company settings.'),
('settings', 'view_audit_logs', 'view_audit_logs', 'View audit logs.'),
('ai', 'use', 'use_ai_assistant', 'Use AI assistant.');
```

- [ ] **Step 3: Reset DB**

Run:

```powershell
supabase db reset
```

Expected: seed rows exist.

- [ ] **Step 4: Verify seed counts**

Run:

```powershell
supabase db query "select count(*) as modules from public.modules; select count(*) as packages from public.packages; select count(*) as permissions from public.permissions;"
```

Expected: modules `12`, packages `4`, permissions `22`.

- [ ] **Step 5: Commit**

Run:

```powershell
git add supabase/migrations
git commit -m "feat: seed phase 1 platform data"
```

Expected: commit succeeds.

---

### Task 7: Add Supabase Clients and Auth Helpers

**Files:**

- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/service-role.ts`
- Create: `lib/auth/require-user.ts`
- Create: `proxy.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. Middleware refreshes sessions.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create service-role client**

Create `lib/supabase/service-role.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
```

- [ ] **Step 4: Create authenticated user helper**

Create `lib/auth/require-user.ts`:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}
```

- [ ] **Step 5: Add proxy session refresh**

Create `proxy.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 6: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 7: Commit**

Run:

```powershell
git add lib proxy.ts
git commit -m "feat: add supabase auth clients"
```

Expected: commit succeeds.

---

### Task 8: Build Login, Signup, and Callback Flow

**Files:**

- Create: `app/auth/actions.ts`
- Create: `components/auth/auth-form.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/callback/route.ts`

- [ ] **Step 1: Create auth server actions**

Create `app/auth/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signIn(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding/company");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Create auth form**

Create `components/auth/auth-form.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<{ error: string } | void>;
  submitLabel: string;
};

export function AuthForm({ title, description, action, submitLabel }: AuthFormProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              await action(formData);
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create login page**

Create `app/(auth)/login/page.tsx`:

```tsx
import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-4">
        <AuthForm
          title="Sign in to AutoSphere ERP"
          description="Access your dealership workspace."
          action={signIn}
          submitLabel="Sign in"
        />
        <p className="text-center text-sm text-slate-300">
          New workspace? <Link className="text-orange-300" href="/signup">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create signup page**

Create `app/(auth)/signup/page.tsx`:

```tsx
import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-4">
        <AuthForm
          title="Create your AutoSphere ERP account"
          description="Start a secure dealership workspace."
          action={signUp}
          submitLabel="Create account"
        />
        <p className="text-center text-sm text-slate-300">
          Already registered? <Link className="text-orange-300" href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create callback route**

Create `app/(auth)/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
```

- [ ] **Step 6: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 7: Commit**

Run:

```powershell
git add app components/auth
git commit -m "feat: add auth pages"
```

Expected: commit succeeds.

---

### Task 9: Build Company Onboarding Server Action

**Files:**

- Create: `lib/validations/company.ts`
- Create: `features/companies/actions.ts`
- Create: `app/(app)/onboarding/company/page.tsx`

- [ ] **Step 1: Create company validation**

Create `lib/validations/company.ts`:

```ts
import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(160).optional(),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/),
  countryCode: z.string().length(2),
  currencyCode: z.string().length(3),
});
```

- [ ] **Step 2: Create company action**

Create `features/companies/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createCompanySchema } from "@/lib/validations/company";
import { requireUser } from "@/lib/auth/require-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") || undefined,
    slug: formData.get("slug"),
    countryCode: formData.get("countryCode"),
    currencyCode: formData.get("currencyCode"),
  });

  if (!parsed.success) {
    return { error: "Company details are invalid." };
  }

  const supabase = createServiceRoleClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile was not found for the signed-in user." };
  }

  const { data: starterPackage, error: packageError } = await supabase
    .from("packages")
    .select("id")
    .eq("package_key", "starter")
    .single();

  if (packageError || !starterPackage) {
    return { error: "Starter package is not configured." };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: parsed.data.name,
      legal_name: parsed.data.legalName,
      slug: parsed.data.slug,
      primary_country_code: parsed.data.countryCode,
      primary_currency_code: parsed.data.currencyCode,
      status: "trial",
    })
    .select("id")
    .single();

  if (companyError || !company) {
    return { error: companyError?.message ?? "Company could not be created." };
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("id");

  if (permissionsError || !permissions?.length) {
    return { error: "Permissions are not configured." };
  }

  const { data: ownerRole, error: roleError } = await supabase
    .from("roles")
    .insert({
      company_id: company.id,
      name: "Company Owner",
      role_key: "company_owner",
      description: "Full administrative access to the company workspace.",
      scope: "company",
      is_system_role: true,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (roleError || !ownerRole) {
    return { error: roleError?.message ?? "Owner role could not be created." };
  }

  await supabase.from("role_permissions").insert(
    permissions.map((permission) => ({
      company_id: company.id,
      role_id: ownerRole.id,
      permission_id: permission.id,
    })),
  );

  await supabase.from("company_memberships").insert({
    company_id: company.id,
    profile_id: profile.id,
    status: "active",
    joined_at: new Date().toISOString(),
  });

  await supabase.from("user_roles").insert({
    company_id: company.id,
    profile_id: profile.id,
    role_id: ownerRole.id,
  });

  await supabase.from("company_settings").insert({
    company_id: company.id,
    branding: { primaryColor: "#f97316", secondaryColor: "#2563eb" },
    localization: { language: "en", rtl: false },
  });

  await supabase.from("subscriptions").insert({
    company_id: company.id,
    package_id: starterPackage.id,
    status: "trialing",
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: profile.id,
  });

  redirect("/dashboard");
}
```

- [ ] **Step 3: Create onboarding page**

Create `app/(app)/onboarding/company/page.tsx`:

```tsx
import { createCompany } from "@/features/companies/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CompanyOnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Create dealership workspace</CardTitle>
          <CardDescription>Set the company identity used for tenant isolation, billing, and branch setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCompany} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="legalName">Legal name</Label>
              <Input id="legalName" name="legalName" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Workspace slug</Label>
              <Input id="slug" name="slug" required aria-label="Workspace slug example: pollux-motors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="countryCode">Country</Label>
                <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currencyCode">Currency</Label>
                <Input id="currencyCode" name="currencyCode" defaultValue="AED" maxLength={3} required />
              </div>
            </div>
            <Button type="submit">Create workspace</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 5: Commit**

Run:

```powershell
git add app/(app)/onboarding lib/validations features/companies
git commit -m "feat: add company onboarding"
```

Expected: commit succeeds.

---

### Task 10: Add Permissions and Module Registry

**Files:**

- Create: `lib/permissions/permissions.ts`
- Create: `lib/modules/module-registry.ts`
- Create: `tests/unit/permissions.test.ts`
- Create: `tests/unit/module-registry.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create permission constants**

Create `lib/permissions/permissions.ts`:

```ts
export const PERMISSIONS = {
  VIEW_VEHICLES: "view_vehicles",
  CREATE_VEHICLE: "create_vehicle",
  UPDATE_VEHICLE: "update_vehicle",
  DELETE_VEHICLE: "delete_vehicle",
  VIEW_VEHICLE_COST: "view_vehicle_cost",
  VIEW_VEHICLE_PROFIT: "view_vehicle_profit",
  CREATE_QUOTATION: "create_quotation",
  APPROVE_DISCOUNT: "approve_discount",
  RESERVE_VEHICLE: "reserve_vehicle",
  CREATE_INVOICE: "create_invoice",
  RECORD_PAYMENT: "record_payment",
  MANAGE_EXPORTS: "manage_exports",
  UPLOAD_DOCUMENTS: "upload_documents",
  VERIFY_DOCUMENTS: "verify_documents",
  MANAGE_MARKETING: "manage_marketing",
  VIEW_REPORTS: "view_reports",
  VIEW_FINANCE: "view_finance",
  MANAGE_USERS: "manage_users",
  MANAGE_SUBSCRIPTIONS: "manage_subscriptions",
  MANAGE_COMPANY_SETTINGS: "manage_company_settings",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  USE_AI_ASSISTANT: "use_ai_assistant",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
```

- [ ] **Step 2: Create module registry**

Create `lib/modules/module-registry.ts`:

```ts
import {
  BarChart3,
  Bot,
  Building2,
  Car,
  ClipboardList,
  FileText,
  Globe2,
  Megaphone,
  Receipt,
  Settings,
  Ship,
  WalletCards,
} from "lucide-react";

export const MODULE_REGISTRY = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { key: "vehicles", label: "Vehicle Inventory", href: "/vehicles", icon: Car },
  { key: "global_stock", label: "Global Stock", href: "/global-stock", icon: Globe2 },
  { key: "crm", label: "Sales CRM", href: "/crm/leads", icon: ClipboardList },
  { key: "sales", label: "Sales", href: "/sales/quotations", icon: Receipt },
  { key: "export", label: "Import & Export", href: "/export/orders", icon: Ship },
  { key: "documents", label: "Documents", href: "/documents", icon: FileText },
  { key: "finance", label: "Finance Lite", href: "/finance", icon: WalletCards },
  { key: "marketing", label: "Marketing", href: "/marketing/listings", icon: Megaphone },
  { key: "ai", label: "AI Intelligence", href: "/ai", icon: Bot },
  { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { key: "settings", label: "Settings", href: "/settings/company", icon: Settings },
  { key: "branches", label: "Branches", href: "/settings/branches", icon: Building2 },
] as const;

export type ModuleKey = (typeof MODULE_REGISTRY)[number]["key"];

export function filterModulesByPackage(enabledKeys: string[]) {
  const enabled = new Set(enabledKeys);
  return MODULE_REGISTRY.filter((module) => enabled.has(module.key) || module.key === "branches");
}
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 4: Add tests**

Create `tests/unit/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("PERMISSIONS", () => {
  it("contains phase 1 management permissions", () => {
    expect(PERMISSIONS.MANAGE_USERS).toBe("manage_users");
    expect(PERMISSIONS.MANAGE_SUBSCRIPTIONS).toBe("manage_subscriptions");
    expect(PERMISSIONS.MANAGE_COMPANY_SETTINGS).toBe("manage_company_settings");
  });
});
```

Create `tests/unit/module-registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterModulesByPackage } from "@/lib/modules/module-registry";

describe("filterModulesByPackage", () => {
  it("returns only package-enabled modules plus branch settings", () => {
    const modules = filterModulesByPackage(["dashboard", "vehicles", "settings"]);
    expect(modules.map((module) => module.key)).toContain("dashboard");
    expect(modules.map((module) => module.key)).toContain("vehicles");
    expect(modules.map((module) => module.key)).toContain("branches");
    expect(modules.map((module) => module.key)).not.toContain("export");
  });
});
```

- [ ] **Step 5: Add test script**

Modify `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run test
```

Expected: both unit tests pass.

- [ ] **Step 7: Commit**

Run:

```powershell
git add lib tests vitest.config.ts package.json package-lock.json
git commit -m "feat: add permission and module registry"
```

Expected: commit succeeds.

---

### Task 11: Build Authenticated App Shell

**Files:**

- Create: `features/subscriptions/queries.ts`
- Create: `components/app-shell/app-sidebar.tsx`
- Create: `components/app-shell/topbar.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `components/dashboard/kpi-card.tsx`

- [ ] **Step 1: Create subscription query**

Create `features/subscriptions/queries.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function getEnabledModuleKeys(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("packages(package_modules(modules(module_key)))")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (error || !data?.packages) {
    return ["dashboard", "settings"];
  }

  const packageData = data.packages as unknown as {
    package_modules: { modules: { module_key: string } }[];
  };

  return packageData.package_modules.map((item) => item.modules.module_key);
}
```

- [ ] **Step 2: Create sidebar**

Create `components/app-shell/app-sidebar.tsx`:

```tsx
import Link from "next/link";
import { filterModulesByPackage } from "@/lib/modules/module-registry";

type AppSidebarProps = {
  enabledModuleKeys: string[];
};

export function AppSidebar({ enabledModuleKeys }: AppSidebarProps) {
  const modules = filterModulesByPackage(enabledModuleKeys);

  return (
    <aside className="hidden w-72 border-r bg-slate-950 text-white lg:block">
      <div className="px-6 py-5">
        <p className="text-lg font-semibold">AutoSphere ERP</p>
        <p className="text-xs text-slate-400">Automotive SaaS Command Center</p>
      </div>
      <nav className="space-y-1 px-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.key}
              href={module.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <Icon className="h-4 w-4 text-orange-300" />
              {module.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create topbar**

Create `components/app-shell/topbar.tsx`:

```tsx
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  companyName: string;
  userEmail: string;
};

export function Topbar({ companyName, userEmail }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <p className="text-sm text-slate-500">Workspace</p>
        <h1 className="text-lg font-semibold text-slate-950">{companyName}</h1>
      </div>
      <form action={signOut} className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{userEmail}</span>
        <Button variant="outline" size="sm" type="submit">Sign out</Button>
      </form>
    </header>
  );
}
```

- [ ] **Step 4: Create app layout**

Create `app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getEnabledModuleKeys } from "@/features/subscriptions/queries";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, company_memberships(company_id, companies(name))")
    .eq("auth_user_id", user.id)
    .single();

  const membership = profile?.company_memberships?.[0];

  if (!profile || !membership) {
    redirect("/onboarding/company");
  }

  const company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies;
  const enabledModuleKeys = await getEnabledModuleKeys(membership.company_id);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar enabledModuleKeys={enabledModuleKeys} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar companyName={company?.name ?? "Workspace"} userEmail={profile.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create KPI card**

Create `components/dashboard/kpi-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string;
  hint: string;
};

export function KpiCard({ title, value, hint }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-slate-950">{value}</div>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Create dashboard page**

Create `app/(app)/dashboard/page.tsx`:

```tsx
import { KpiCard } from "@/components/dashboard/kpi-card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Dashboard</h2>
        <p className="text-sm text-slate-500">Phase 1 foundation is connected to your secured workspace.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Tenant Isolation" value="RLS" hint="Company data is protected by database policies." />
        <KpiCard title="Subscription" value="Starter" hint="Module access is package-gated." />
        <KpiCard title="Branches" value="Ready" hint="Branch setup is available in settings." />
        <KpiCard title="Users" value="RBAC" hint="Roles and permissions are part of the foundation." />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 8: Commit**

Run:

```powershell
git add app components features/subscriptions
git commit -m "feat: add authenticated app shell"
```

Expected: commit succeeds.

---

### Task 12: Add Branch Management Foundation

**Files:**

- Create: `lib/validations/branch.ts`
- Create: `features/branches/actions.ts`
- Create: `features/branches/queries.ts`
- Create: `app/(app)/settings/branches/page.tsx`

- [ ] **Step 1: Create branch validation**

Create `lib/validations/branch.ts`:

```ts
import { z } from "zod";

export const createBranchSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(20),
  countryCode: z.string().length(2),
  city: z.string().min(2).max(80),
  currencyCode: z.string().length(3),
});
```

- [ ] **Step 2: Create branch queries**

Create `features/branches/queries.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function getBranches(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, code, country_code, city, currency_code, status")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

- [ ] **Step 3: Create branch action**

Create `features/branches/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createBranchSchema } from "@/lib/validations/branch";
import { createClient } from "@/lib/supabase/server";

export async function createBranch(formData: FormData) {
  const parsed = createBranchSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    code: formData.get("code"),
    countryCode: formData.get("countryCode"),
    city: formData.get("city"),
    currencyCode: formData.get("currencyCode"),
  });

  if (!parsed.success) {
    return { error: "Branch details are invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({
    company_id: parsed.data.companyId,
    name: parsed.data.name,
    code: parsed.data.code,
    country_code: parsed.data.countryCode,
    city: parsed.data.city,
    currency_code: parsed.data.currencyCode,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/branches");
}
```

- [ ] **Step 4: Create branches page**

Create `app/(app)/settings/branches/page.tsx`:

```tsx
import { createBranch } from "@/features/branches/actions";
import { getBranches } from "@/features/branches/queries";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function getCurrentCompanyId() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("company_memberships(company_id)")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.company_memberships?.[0]?.company_id) {
    throw new Error("Current company was not found.");
  }

  return data.company_memberships[0].company_id;
}

export default async function BranchesPage() {
  const companyId = await getCurrentCompanyId();
  const branches = await getBranches(companyId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Branches</h2>
        <p className="text-sm text-slate-500">Manage company locations and branch-level access.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add branch</CardTitle>
          <CardDescription>Create a real branch record protected by tenant RLS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBranch} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="companyId" value={companyId} />
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="countryCode">Country</Label>
              <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Input id="currencyCode" name="currencyCode" defaultValue="AED" maxLength={3} required />
            </div>
            <div className="flex items-end">
              <Button type="submit">Add branch</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Branch list</CardTitle>
          <CardDescription>{branches.length} active branch records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{branch.name}</td>
                    <td className="px-4 py-3">{branch.code}</td>
                    <td className="px-4 py-3">{branch.city}</td>
                    <td className="px-4 py-3">{branch.currency_code}</td>
                    <td className="px-4 py-3">{branch.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 6: Commit**

Run:

```powershell
git add app/(app)/settings/branches features/branches lib/validations/branch.ts
git commit -m "feat: add branch management foundation"
```

Expected: commit succeeds.

---

### Task 13: Add Users, Roles, and Subscription Settings Pages

**Files:**

- Create: `features/users/queries.ts`
- Create: `features/users/actions.ts`
- Create: `app/(app)/settings/users/page.tsx`
- Create: `app/(app)/settings/roles/page.tsx`
- Create: `app/(app)/subscriptions/page.tsx`
- Create: `app/(app)/settings/company/page.tsx`

- [ ] **Step 1: Create user query**

Create `features/users/queries.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function getCompanyUsers(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_memberships")
    .select("id, status, profiles(id, full_name, email), user_roles(roles(name))")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

- [ ] **Step 2: Create invite validation action**

Create `features/users/actions.ts`:

```ts
"use server";

import { z } from "zod";

const inviteUserSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid(),
});

export async function validateInviteUser(formData: FormData) {
  const parsed = inviteUserSchema.safeParse({
    companyId: formData.get("companyId"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: "Invite details are invalid." };
  }

  return { data: parsed.data };
}
```

- [ ] **Step 3: Create users page**

Create `app/(app)/settings/users/page.tsx`:

```tsx
import { getCompanyUsers } from "@/features/users/queries";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getCurrentCompanyId() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("company_memberships(company_id)")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.company_memberships?.[0]?.company_id) {
    throw new Error("Current company was not found.");
  }

  return data.company_memberships[0].company_id;
}

export default async function UsersPage() {
  const companyId = await getCurrentCompanyId();
  const users = await getCompanyUsers(companyId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Users</h2>
        <p className="text-sm text-slate-500">View company members and assigned roles.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Company users</CardTitle>
          <CardDescription>{users.length} memberships returned through RLS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((membership) => {
                  const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
                  return (
                    <tr key={membership.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{profile?.full_name}</td>
                      <td className="px-4 py-3">{profile?.email}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{membership.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create roles page**

Create `app/(app)/settings/roles/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function getCurrentCompanyId() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("company_memberships(company_id)")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.company_memberships?.[0]?.company_id) {
    throw new Error("Current company was not found.");
  }

  return data.company_memberships[0].company_id;
}

export default async function RolesPage() {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, name, role_key, description, scope")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Roles</h2>
        <p className="text-sm text-slate-500">Review permission groups configured for this company.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
              <CardDescription>{role.role_key} - {role.scope}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{role.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create subscriptions page**

Create `app/(app)/subscriptions/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getCurrentCompanyId() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("company_memberships(company_id)")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.company_memberships?.[0]?.company_id) {
    throw new Error("Current company was not found.");
  }

  return data.company_memberships[0].company_id;
}

export default async function SubscriptionsPage() {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, packages(name, package_key, max_branches, max_users, max_vehicles)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const packageData = Array.isArray(data.packages) ? data.packages[0] : data.packages;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Subscription</h2>
        <p className="text-sm text-slate-500">Package access controls modules and usage limits.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{packageData?.name}</CardTitle>
          <CardDescription>{packageData?.package_key}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <Badge>{data.status}</Badge>
          <span>Branches: {packageData?.max_branches ?? "Unlimited"}</span>
          <span>Users: {packageData?.max_users ?? "Unlimited"}</span>
          <span>Vehicles: {packageData?.max_vehicles ?? "Unlimited"}</span>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Create company settings page**

Create `app/(app)/settings/company/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CompanySettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("company_memberships(companies(name, legal_name, primary_country_code, primary_currency_code, default_language, timezone, company_settings(branding, localization)))")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.company_memberships?.[0]) {
    throw new Error("Company settings were not found.");
  }

  const membership = data.company_memberships[0];
  const company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies;
  const settings = Array.isArray(company.company_settings) ? company.company_settings[0] : company.company_settings;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Company settings</h2>
        <p className="text-sm text-slate-500">White-label identity and localization defaults.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{company.name}</CardTitle>
          <CardDescription>{company.legal_name ?? "Legal name not set"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <span>Country: {company.primary_country_code}</span>
          <span>Currency: {company.primary_currency_code}</span>
          <span>Language: {company.default_language}</span>
          <span>Timezone: {company.timezone}</span>
          <span>Branding: {JSON.stringify(settings?.branding ?? {})}</span>
          <span>Localization: {JSON.stringify(settings?.localization ?? {})}</span>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Run lint**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 8: Commit**

Run:

```powershell
git add app/(app)/settings app/(app)/subscriptions features/users
git commit -m "feat: add foundation settings pages"
```

Expected: commit succeeds.

---

### Task 14: Add SQL RLS Isolation Tests

**Files:**

- Create: `supabase/tests/phase_1_rls.sql`

- [ ] **Step 1: Create SQL test script**

Create `supabase/tests/phase_1_rls.sql`:

```sql
begin;

select plan(4);

select ok(
  exists(select 1 from public.modules where module_key = 'dashboard'),
  'seeded dashboard module exists'
);

select ok(
  exists(select 1 from public.packages where package_key = 'starter'),
  'starter package exists'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'manage_users'),
  'manage_users permission exists'
);

select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'companies'),
  'companies has RLS policies'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run database test**

Run:

```powershell
supabase test db
```

Expected: all four assertions pass.

- [ ] **Step 3: Commit**

Run:

```powershell
git add supabase/tests
git commit -m "test: add phase 1 rls checks"
```

Expected: commit succeeds.

---

### Task 15: Add E2E Smoke Test Structure

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/e2e/auth-workspace.spec.ts`

- [ ] **Step 1: Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

- [ ] **Step 2: Create smoke test**

Create `tests/e2e/auth-workspace.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to AutoSphere ERP" })).toBeVisible();
});
```

- [ ] **Step 3: Add E2E script**

Modify `package.json` scripts:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 4: Run E2E smoke test**

Run:

```powershell
npm run test:e2e
```

Expected: login page renders test passes.

- [ ] **Step 5: Commit**

Run:

```powershell
git add playwright.config.ts tests/e2e package.json package-lock.json
git commit -m "test: add e2e smoke test"
```

Expected: commit succeeds.

---

### Task 16: Add Phase 1 Documentation

**Files:**

- Modify: `README.md`
- Create: `docs/phase-1-saas-foundation.md`

- [ ] **Step 1: Write README**

Write `README.md` with this content:

```md
# AutoSphere ERP

Production white-label Automotive SaaS ERP for showrooms, dealers, brokers, import/export companies, and multi-branch automotive groups.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- Supabase Storage-ready architecture

## Local Development

1. Install dependencies with `npm install`.
2. Start Supabase with `supabase start`.
3. Copy values into `.env.local`.
4. Reset database with `supabase db reset`.
5. Start the app with `npm run dev`.

## Security Model

Every tenant-owned business table includes `company_id`. RLS policies use active company memberships and permission checks to prevent cross-tenant access. Service role keys are server-only.

## Phase 1

Phase 1 builds auth, companies, branches, roles, permissions, subscriptions, module access, audit logs, seed data, and the authenticated dashboard shell.
```

- [ ] **Step 2: Write phase documentation**

Create `docs/phase-1-saas-foundation.md`:

```md
# Phase 1 SaaS Foundation

Phase 1 establishes the production foundation for AutoSphere ERP.

## Implemented

- Next.js App Router foundation
- Supabase local configuration
- Core SaaS schema
- RLS helper functions
- RLS policies
- Package and module seed data
- Auth pages
- Company onboarding
- Dashboard shell
- Branch settings foundation
- User, role, subscription settings foundation
- Unit, SQL, and E2E smoke tests

## Verification

Run:

```powershell
npm run lint
npm run test
npm run test:e2e
supabase db reset
supabase test db
```

## Security Notes

- RLS is enabled for all Phase 1 public tables.
- Authorization data is stored in database tables.
- User-editable metadata is not used for permissions.
- Service role keys are isolated to server-only code.
```

- [ ] **Step 3: Run verification**

Run:

```powershell
npm run lint
npm run test
supabase db reset
supabase test db
```

Expected: all commands pass.

- [ ] **Step 4: Commit**

Run:

```powershell
git add README.md docs/phase-1-saas-foundation.md
git commit -m "docs: document phase 1 foundation"
```

Expected: commit succeeds.

---

## Final Verification

Run all verification commands:

```powershell
npm run lint
npm run test
npm run test:e2e
supabase db reset
supabase test db
git status --short
```

Expected:

- Lint passes.
- Unit tests pass.
- E2E smoke test passes.
- Supabase migrations apply from scratch.
- SQL tests pass.
- `git status --short` shows no uncommitted changes.

## Completion Criteria

Phase 1 is complete when:

- A user can sign up, sign in, and sign out.
- A signed-in user can create a company workspace.
- Company, branch, membership, role, permission, subscription, module, notification, and audit tables exist.
- RLS is enabled on every Phase 1 public table.
- Module/package seed data exists.
- Sidebar module access is based on enabled package modules.
- Company onboarding writes real Supabase records.
- Foundation pages read real Supabase data through RLS.
- Permission constants and module gating have unit tests.
- Database seed/RLS checks run through Supabase test tooling.
- Documentation explains local setup and security model.

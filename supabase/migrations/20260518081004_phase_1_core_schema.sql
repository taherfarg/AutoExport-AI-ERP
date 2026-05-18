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
  unique (company_id, code),
  unique (id, company_id)
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
  branch_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, profile_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete cascade
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
  unique (id, company_id),
  constraint roles_scope_check check (scope in ('company', 'global')),
  constraint roles_scope_company_check check (
    (scope = 'company' and company_id is not null)
    or (scope = 'global' and company_id is null)
  )
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role_id uuid not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id),
  foreign key (role_id, company_id) references public.roles(id, company_id) on delete cascade
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete cascade,
  foreign key (role_id, company_id) references public.roles(id, company_id) on delete cascade
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
  branch_id uuid not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  profile_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete cascade
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  branch_id uuid,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  severity public.audit_severity not null default 'info',
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint audit_logs_branch_company_check check (branch_id is null or company_id is not null),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null
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
set search_path = pg_catalog, public
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

revoke all on schema app_private from public, anon, authenticated;
revoke execute on function app_private.handle_new_auth_user() from public, anon, authenticated;

create index companies_status_idx on public.companies(status);
create index branches_company_id_idx on public.branches(company_id);
create index branches_company_status_idx on public.branches(company_id, status);
create index profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index company_memberships_company_profile_idx on public.company_memberships(company_id, profile_id);
create index company_memberships_profile_status_idx on public.company_memberships(profile_id, status);
create index branch_memberships_company_branch_profile_idx on public.branch_memberships(company_id, branch_id, profile_id);
create index subscriptions_company_id_idx on public.subscriptions(company_id);
create index subscriptions_package_id_idx on public.subscriptions(package_id);
create index roles_company_id_idx on public.roles(company_id);
create unique index roles_company_role_key_unique on public.roles(company_id, role_key) where company_id is not null;
create unique index roles_global_role_key_unique on public.roles(role_key) where company_id is null;
create index role_permissions_company_id_idx on public.role_permissions(company_id);
create index user_roles_company_profile_idx on public.user_roles(company_id, profile_id) where deleted_at is null;
create index user_roles_role_id_idx on public.user_roles(role_id);
create index branch_settings_company_id_idx on public.branch_settings(company_id);
create index notifications_company_id_idx on public.notifications(company_id);
create index notifications_profile_unread_idx on public.notifications(profile_id, read_at) where deleted_at is null;
create index audit_logs_company_created_idx on public.audit_logs(company_id, created_at desc);
create index audit_logs_branch_id_idx on public.audit_logs(branch_id);
create index audit_logs_actor_profile_id_idx on public.audit_logs(actor_profile_id);

create type public.billing_provider as enum ('stripe', 'manual');
create type public.billing_customer_status as enum ('pending', 'active', 'disabled');
create type public.billing_event_status as enum ('received', 'processed', 'failed', 'ignored');
create type public.usage_limit_event_type as enum ('warning', 'blocked', 'resolved');

alter table public.packages
  add column if not exists stripe_price_id text,
  add column if not exists billing_interval text not null default 'month';

insert into public.permissions (module_key, action_key, permission_key, description) values
('settings', 'view_billing', 'view_billing', 'View billing customer, subscription, and usage status.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager')
  and p.permission_key in ('view_billing', 'manage_subscriptions')
on conflict (role_id, permission_id) do nothing;

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider public.billing_provider not null default 'stripe',
  provider_customer_id text,
  billing_email text,
  billing_name text,
  status public.billing_customer_status not null default 'pending',
  default_currency_code char(3) not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, provider),
  unique (provider, provider_customer_id),
  unique (id, company_id)
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  provider public.billing_provider not null default 'stripe',
  provider_event_id text not null,
  event_type text not null,
  event_status public.billing_event_status not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  metric_key text not null,
  period_start date not null,
  period_end date not null,
  current_value numeric(14,2) not null default 0,
  limit_value numeric(14,2),
  source_table text,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, metric_key, period_start, period_end),
  unique (id, company_id),
  constraint usage_counters_values_check check (
    current_value >= 0 and (limit_value is null or limit_value >= 0) and period_end >= period_start
  )
);

create table public.usage_limit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  metric_key text not null,
  event_type public.usage_limit_event_type not null,
  current_value numeric(14,2) not null default 0,
  limit_value numeric(14,2),
  entity_type text,
  entity_id uuid,
  message text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (id, company_id),
  constraint usage_limit_events_values_check check (
    current_value >= 0 and (limit_value is null or limit_value >= 0)
  )
);

create trigger billing_customers_set_updated_at before update on public.billing_customers for each row execute function public.set_updated_at();
create trigger usage_counters_set_updated_at before update on public.usage_counters for each row execute function public.set_updated_at();

create index billing_customers_company_idx on public.billing_customers(company_id) where deleted_at is null;
create index billing_customers_provider_customer_idx on public.billing_customers(provider, provider_customer_id) where provider_customer_id is not null;
create index billing_events_company_created_idx on public.billing_events(company_id, created_at desc);
create index billing_events_status_idx on public.billing_events(event_status, created_at desc);
create index usage_counters_company_metric_idx on public.usage_counters(company_id, metric_key, period_start desc);
create index usage_limit_events_company_metric_idx on public.usage_limit_events(company_id, metric_key, created_at desc);

grant select, insert, update, delete on public.billing_customers to authenticated;
grant select, insert, update, delete on public.billing_events to authenticated;
grant select, insert, update, delete on public.usage_counters to authenticated;
grant select, insert, update, delete on public.usage_limit_events to authenticated;

alter table public.billing_customers enable row level security;
alter table public.billing_events enable row level security;
alter table public.usage_counters enable row level security;
alter table public.usage_limit_events enable row level security;

create policy "billing_customers_select_billing" on public.billing_customers
  for select to authenticated
  using (
    deleted_at is null
    and (
      app_private.has_company_permission(company_id, 'view_billing')
      or app_private.has_company_permission(company_id, 'manage_subscriptions')
    )
  );

create policy "billing_customers_manage_subscriptions" on public.billing_customers
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_subscriptions'))
  with check (app_private.has_company_permission(company_id, 'manage_subscriptions'));

create policy "billing_events_select_billing" on public.billing_events
  for select to authenticated
  using (
    company_id is not null
    and (
      app_private.has_company_permission(company_id, 'view_billing')
      or app_private.has_company_permission(company_id, 'manage_subscriptions')
    )
  );

create policy "billing_events_manage_subscriptions" on public.billing_events
  for all to authenticated
  using (company_id is not null and app_private.has_company_permission(company_id, 'manage_subscriptions'))
  with check (company_id is not null and app_private.has_company_permission(company_id, 'manage_subscriptions'));

create policy "usage_counters_select_billing" on public.usage_counters
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_billing')
    or app_private.has_company_permission(company_id, 'manage_subscriptions')
  );

create policy "usage_counters_manage_subscriptions" on public.usage_counters
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_subscriptions'))
  with check (app_private.has_company_permission(company_id, 'manage_subscriptions'));

create policy "usage_limit_events_select_billing" on public.usage_limit_events
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_billing')
    or app_private.has_company_permission(company_id, 'manage_subscriptions')
  );

create policy "usage_limit_events_manage_subscriptions" on public.usage_limit_events
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_subscriptions'))
  with check (app_private.has_company_permission(company_id, 'manage_subscriptions'));

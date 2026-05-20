create type public.vehicle_intelligence_provider_status as enum ('pending', 'completed', 'failed', 'manual_review');
create type public.vehicle_enrichment_event_type as enum ('vin_decode', 'market_valuation', 'competitor_price', 'history_report', 'manual_note');
create type public.vehicle_history_report_status as enum ('requested', 'available', 'completed', 'failed');

insert into public.permissions (module_key, action_key, permission_key, description) values
('vehicles', 'manage_intelligence', 'manage_vehicle_intelligence', 'Create and manage VIN decode, valuation, competitor pricing, and history intelligence records.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager', 'inventory_manager')
  and p.permission_key = 'manage_vehicle_intelligence'
on conflict (role_id, permission_id) do nothing;

create table public.vin_decode_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  vehicle_id uuid not null,
  vin text not null,
  provider text not null default 'manual',
  provider_request_id text,
  status public.vehicle_intelligence_provider_status not null default 'pending',
  decoded_payload jsonb not null default '{}'::jsonb,
  decoded_brand text,
  decoded_model text,
  decoded_year integer,
  decoded_trim text,
  decoded_body_type text,
  decoded_engine text,
  decoded_transmission text,
  confidence_score numeric(5,2),
  error_message text,
  notes text,
  requested_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  constraint vin_decode_year_check check (decoded_year is null or decoded_year between 1900 and 2100),
  constraint vin_decode_confidence_check check (confidence_score is null or confidence_score between 0 and 100)
);

create table public.vehicle_market_values (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  vehicle_id uuid not null,
  provider text not null default 'manual',
  provider_reference text,
  market_country_code char(2) not null default 'AE',
  market_currency_code char(3) not null default 'AED',
  market_low numeric(14,2) not null default 0,
  market_average numeric(14,2) not null default 0,
  market_high numeric(14,2) not null default 0,
  recommended_price numeric(14,2) not null default 0,
  confidence_score numeric(5,2),
  sample_size integer not null default 0,
  valuation_payload jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  constraint vehicle_market_values_amounts_check check (
    market_low >= 0 and market_average >= 0 and market_high >= 0 and recommended_price >= 0 and sample_size >= 0
  ),
  constraint vehicle_market_values_confidence_check check (confidence_score is null or confidence_score between 0 and 100)
);

create table public.vehicle_competitor_prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  vehicle_id uuid not null,
  source_name text not null,
  competitor_name text,
  listing_url text,
  price numeric(14,2) not null,
  currency_code char(3) not null default 'AED',
  mileage integer not null default 0,
  location text,
  observed_at date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  constraint vehicle_competitor_prices_amount_check check (price >= 0 and mileage >= 0)
);

create table public.vehicle_history_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  vehicle_id uuid not null,
  provider text not null default 'manual',
  provider_report_id text,
  report_url text,
  report_status public.vehicle_history_report_status not null default 'requested',
  risk_summary text not null default 'unknown',
  accident_count integer not null default 0,
  owner_count integer not null default 0,
  odometer_issue boolean not null default false,
  salvage_or_theft_flag boolean not null default false,
  report_payload jsonb not null default '{}'::jsonb,
  notes text,
  requested_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  constraint vehicle_history_reports_counts_check check (accident_count >= 0 and owner_count >= 0),
  constraint vehicle_history_reports_risk_check check (risk_summary in ('unknown', 'low', 'medium', 'high'))
);

create table public.vehicle_enrichment_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  vehicle_id uuid not null,
  event_type public.vehicle_enrichment_event_type not null,
  source_table text,
  source_id uuid,
  title text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade
);

create trigger vin_decode_requests_set_updated_at before update on public.vin_decode_requests for each row execute function public.set_updated_at();
create trigger vehicle_market_values_set_updated_at before update on public.vehicle_market_values for each row execute function public.set_updated_at();
create trigger vehicle_competitor_prices_set_updated_at before update on public.vehicle_competitor_prices for each row execute function public.set_updated_at();
create trigger vehicle_history_reports_set_updated_at before update on public.vehicle_history_reports for each row execute function public.set_updated_at();

create index vin_decode_requests_company_vehicle_idx on public.vin_decode_requests(company_id, vehicle_id, created_at desc) where deleted_at is null;
create index vin_decode_requests_company_status_idx on public.vin_decode_requests(company_id, status) where deleted_at is null;
create index vehicle_market_values_company_vehicle_idx on public.vehicle_market_values(company_id, vehicle_id, created_at desc) where deleted_at is null;
create index vehicle_competitor_prices_company_vehicle_idx on public.vehicle_competitor_prices(company_id, vehicle_id, observed_at desc) where deleted_at is null;
create index vehicle_history_reports_company_vehicle_idx on public.vehicle_history_reports(company_id, vehicle_id, created_at desc) where deleted_at is null;
create index vehicle_enrichment_logs_company_vehicle_idx on public.vehicle_enrichment_logs(company_id, vehicle_id, created_at desc) where deleted_at is null;

grant select, insert, update, delete on public.vin_decode_requests to authenticated;
grant select, insert, update, delete on public.vehicle_market_values to authenticated;
grant select, insert, update, delete on public.vehicle_competitor_prices to authenticated;
grant select, insert, update, delete on public.vehicle_history_reports to authenticated;
grant select, insert, update, delete on public.vehicle_enrichment_logs to authenticated;

alter table public.vin_decode_requests enable row level security;
alter table public.vehicle_market_values enable row level security;
alter table public.vehicle_competitor_prices enable row level security;
alter table public.vehicle_history_reports enable row level security;
alter table public.vehicle_enrichment_logs enable row level security;

create policy "vin_decode_requests_select_vehicle_viewers" on public.vin_decode_requests
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vin_decode_requests_manage_vehicle_intelligence" on public.vin_decode_requests
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_vehicle_intelligence'))
  with check (
    app_private.has_company_permission(company_id, 'manage_vehicle_intelligence')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_market_values_select_vehicle_viewers" on public.vehicle_market_values
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_market_values_manage_vehicle_intelligence" on public.vehicle_market_values
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_vehicle_intelligence'))
  with check (
    app_private.has_company_permission(company_id, 'manage_vehicle_intelligence')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_competitor_prices_select_vehicle_viewers" on public.vehicle_competitor_prices
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_competitor_prices_manage_vehicle_intelligence" on public.vehicle_competitor_prices
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_vehicle_intelligence'))
  with check (
    app_private.has_company_permission(company_id, 'manage_vehicle_intelligence')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_history_reports_select_vehicle_viewers" on public.vehicle_history_reports
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_history_reports_manage_vehicle_intelligence" on public.vehicle_history_reports
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_vehicle_intelligence'))
  with check (
    app_private.has_company_permission(company_id, 'manage_vehicle_intelligence')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_enrichment_logs_select_vehicle_viewers" on public.vehicle_enrichment_logs
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_enrichment_logs_manage_vehicle_intelligence" on public.vehicle_enrichment_logs
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_vehicle_intelligence'))
  with check (
    app_private.has_company_permission(company_id, 'manage_vehicle_intelligence')
    and app_private.can_access_branch(company_id, branch_id)
  );

with demo_vehicle as (
  select v.company_id, v.branch_id, v.id as vehicle_id, v.vin, v.brand, v.model, v.year, v.selling_price, v.currency_code, v.created_by
  from public.vehicles v
  where v.deleted_at is null
  order by v.created_at
  limit 12
),
inserted_vin as (
  insert into public.vin_decode_requests (
    company_id,
    branch_id,
    vehicle_id,
    vin,
    provider,
    status,
    decoded_brand,
    decoded_model,
    decoded_year,
    confidence_score,
    notes,
    requested_by,
    created_by,
    updated_by
  )
  select company_id, branch_id, vehicle_id, vin, 'manual_seed', 'completed', brand, model, year, 92, 'Seed VIN decode for vehicle intelligence dashboard.', created_by, created_by, created_by
  from demo_vehicle
  on conflict do nothing
  returning id, company_id, branch_id, vehicle_id, created_by
),
inserted_valuation as (
  insert into public.vehicle_market_values (
    company_id,
    branch_id,
    vehicle_id,
    provider,
    market_country_code,
    market_currency_code,
    market_low,
    market_average,
    market_high,
    recommended_price,
    confidence_score,
    sample_size,
    notes,
    created_by,
    updated_by
  )
  select
    company_id,
    branch_id,
    vehicle_id,
    'manual_seed',
    'AE',
    currency_code,
    greatest(selling_price * 0.9, 0),
    selling_price,
    selling_price * 1.08,
    selling_price,
    78,
    6,
    'Seed valuation for vehicle intelligence dashboard.',
    created_by,
    created_by
  from demo_vehicle
  on conflict do nothing
  returning id, company_id, branch_id, vehicle_id, created_by
)
insert into public.vehicle_enrichment_logs (company_id, branch_id, vehicle_id, event_type, source_table, source_id, title, description, created_by)
select company_id, branch_id, vehicle_id, 'vin_decode'::public.vehicle_enrichment_event_type, 'vin_decode_requests', id, 'VIN decoded', 'Seed VIN decode completed.', created_by
from inserted_vin
union all
select company_id, branch_id, vehicle_id, 'market_valuation'::public.vehicle_enrichment_event_type, 'vehicle_market_values', id, 'Market valuation saved', 'Seed market valuation saved.', created_by
from inserted_valuation;

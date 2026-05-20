create type public.listing_sync_operation as enum ('publish', 'update', 'unpublish', 'refresh');
create type public.listing_sync_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type public.listing_sync_log_severity as enum ('debug', 'info', 'warning', 'error');
create type public.marketplace_lead_status as enum ('new', 'contacted', 'converted', 'lost', 'spam');

create table public.marketplace_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_key text not null,
  name text not null,
  provider text not null default 'manual',
  channel_type public.marketing_channel_type not null default 'marketplace',
  base_url text,
  external_account_id text,
  sync_enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, channel_key),
  unique (id, company_id)
);

create table public.listing_price_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  listing_id uuid not null,
  marketplace_channel_id uuid not null,
  override_price numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  reason text,
  notes text,
  starts_at date,
  ends_at date,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, listing_id, marketplace_channel_id),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (listing_id, company_id) references public.marketing_listings(id, company_id) on delete cascade,
  foreign key (marketplace_channel_id, company_id) references public.marketplace_channels(id, company_id) on delete cascade,
  constraint listing_price_overrides_price_check check (override_price >= 0)
);

create table public.listing_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  listing_id uuid not null,
  marketplace_channel_id uuid not null,
  operation public.listing_sync_operation not null default 'publish',
  status public.listing_sync_status not null default 'queued',
  requested_payload jsonb not null default '{}'::jsonb,
  external_reference text,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (listing_id, company_id) references public.marketing_listings(id, company_id) on delete cascade,
  foreign key (marketplace_channel_id, company_id) references public.marketplace_channels(id, company_id) on delete cascade
);

create table public.listing_sync_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  sync_job_id uuid,
  listing_id uuid,
  marketplace_channel_id uuid,
  severity public.listing_sync_log_severity not null default 'info',
  message text not null,
  provider_code text,
  external_reference text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (sync_job_id, company_id) references public.listing_sync_jobs(id, company_id) on delete cascade,
  foreign key (listing_id, company_id) references public.marketing_listings(id, company_id) on delete set null (listing_id),
  foreign key (marketplace_channel_id, company_id) references public.marketplace_channels(id, company_id) on delete set null (marketplace_channel_id)
);

create table public.marketplace_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  marketplace_channel_id uuid,
  listing_id uuid,
  vehicle_id uuid,
  source_lead_id text,
  lead_name text,
  phone text,
  whatsapp text,
  email text,
  country_code char(2),
  city text,
  message text,
  budget numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  status public.marketplace_lead_status not null default 'new',
  captured_at timestamptz not null default now(),
  converted_lead_id uuid,
  raw_payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (marketplace_channel_id, company_id) references public.marketplace_channels(id, company_id) on delete set null (marketplace_channel_id),
  foreign key (listing_id, company_id) references public.marketing_listings(id, company_id) on delete set null (listing_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (converted_lead_id, company_id) references public.leads(id, company_id) on delete set null (converted_lead_id),
  constraint marketplace_leads_contact_check check (
    nullif(trim(coalesce(phone, '')), '') is not null
    or nullif(trim(coalesce(whatsapp, '')), '') is not null
    or nullif(trim(coalesce(email, '')), '') is not null
  ),
  constraint marketplace_leads_budget_check check (budget >= 0)
);

create trigger marketplace_channels_set_updated_at before update on public.marketplace_channels for each row execute function public.set_updated_at();
create trigger listing_price_overrides_set_updated_at before update on public.listing_price_overrides for each row execute function public.set_updated_at();
create trigger listing_sync_jobs_set_updated_at before update on public.listing_sync_jobs for each row execute function public.set_updated_at();
create trigger marketplace_leads_set_updated_at before update on public.marketplace_leads for each row execute function public.set_updated_at();

create or replace function app_private.increment_listing_lead_count_from_marketplace()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.listing_id is not null then
    update public.marketing_listings
    set lead_count = lead_count + 1,
        updated_at = now()
    where id = new.listing_id
      and company_id = new.company_id;
  end if;

  return new;
end;
$$;

create trigger marketplace_leads_increment_listing_count
  after insert on public.marketplace_leads
  for each row execute function app_private.increment_listing_lead_count_from_marketplace();

create index marketplace_channels_company_type_idx on public.marketplace_channels(company_id, channel_type) where deleted_at is null;
create index listing_price_overrides_company_listing_idx on public.listing_price_overrides(company_id, listing_id) where deleted_at is null;
create index listing_sync_jobs_company_status_idx on public.listing_sync_jobs(company_id, status) where deleted_at is null;
create index listing_sync_jobs_company_listing_idx on public.listing_sync_jobs(company_id, listing_id) where deleted_at is null;
create index listing_sync_logs_company_job_idx on public.listing_sync_logs(company_id, sync_job_id) where deleted_at is null;
create index marketplace_leads_company_status_idx on public.marketplace_leads(company_id, status) where deleted_at is null;
create index marketplace_leads_company_listing_idx on public.marketplace_leads(company_id, listing_id) where deleted_at is null;

grant select, insert, update, delete on public.marketplace_channels to authenticated;
grant select, insert, update, delete on public.listing_price_overrides to authenticated;
grant select, insert, update, delete on public.listing_sync_jobs to authenticated;
grant select, insert, update, delete on public.listing_sync_logs to authenticated;
grant select, insert, update, delete on public.marketplace_leads to authenticated;

alter table public.marketplace_channels enable row level security;
alter table public.listing_price_overrides enable row level security;
alter table public.listing_sync_jobs enable row level security;
alter table public.listing_sync_logs enable row level security;
alter table public.marketplace_leads enable row level security;

create policy "marketplace_channels_select_marketers" on public.marketplace_channels
  for select to authenticated
  using (deleted_at is null and app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "marketplace_channels_manage_marketers" on public.marketplace_channels
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "listing_price_overrides_select_marketers" on public.listing_price_overrides
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "listing_price_overrides_manage_marketers" on public.listing_price_overrides
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing') and app_private.can_access_branch(company_id, branch_id));

create policy "listing_sync_jobs_select_marketers" on public.listing_sync_jobs
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "listing_sync_jobs_manage_marketers" on public.listing_sync_jobs
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing') and app_private.can_access_branch(company_id, branch_id));

create policy "listing_sync_logs_select_marketers" on public.listing_sync_logs
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "listing_sync_logs_manage_marketers" on public.listing_sync_logs
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing') and app_private.can_access_branch(company_id, branch_id));

create policy "marketplace_leads_select_marketers" on public.marketplace_leads
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "marketplace_leads_manage_marketers" on public.marketplace_leads
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing') and app_private.can_access_branch(company_id, branch_id));

insert into public.marketplace_channels (company_id, channel_key, name, provider, channel_type, base_url, sync_enabled, settings)
select c.id,
       seed.channel_key,
       seed.name,
       seed.provider,
       seed.channel_type::public.marketing_channel_type,
       seed.base_url,
       false,
       jsonb_build_object('mode', 'manual', 'region', seed.region)
from public.companies c
cross join (values
  ('website_inventory', 'Website Inventory', 'website', 'website', null, 'global'),
  ('dubizzle', 'Dubizzle', 'dubizzle', 'marketplace', 'https://dubizzle.com', 'gcc'),
  ('autotrader', 'AutoTrader', 'autotrader', 'marketplace', 'https://www.autotrader.com', 'global'),
  ('facebook_marketplace', 'Facebook Marketplace', 'meta', 'marketplace', 'https://www.facebook.com/marketplace', 'global'),
  ('instagram_shop', 'Instagram Shop', 'meta', 'instagram', 'https://www.instagram.com', 'global'),
  ('export_portal', 'Export Portal', 'manual_export', 'export_portal', null, 'global')
) as seed(channel_key, name, provider, channel_type, base_url, region)
on conflict (company_id, channel_key) do nothing;

insert into public.listing_price_overrides (
  company_id,
  branch_id,
  listing_id,
  marketplace_channel_id,
  override_price,
  currency_code,
  reason,
  active,
  created_by,
  updated_by
)
select ml.company_id,
       ml.branch_id,
       ml.id,
       mc.id,
       ml.price,
       ml.currency_code,
       'Initial seeded channel price',
       true,
       ml.created_by,
       ml.updated_by
from public.marketing_listings ml
join public.marketplace_channels mc on mc.company_id = ml.company_id and mc.channel_key = 'website_inventory'
where ml.deleted_at is null
on conflict (company_id, listing_id, marketplace_channel_id) do nothing;

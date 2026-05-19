create type public.marketing_listing_status as enum ('draft', 'active', 'paused', 'sold', 'archived');
create type public.marketing_channel_type as enum (
  'website',
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'whatsapp',
  'marketplace',
  'export_portal',
  'other'
);
create type public.social_post_status as enum ('draft', 'scheduled', 'published', 'failed', 'archived');
create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed', 'cancelled');
create type public.content_calendar_status as enum ('planned', 'scheduled', 'published', 'cancelled');

create table public.listing_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_key text not null,
  name text not null,
  channel_type public.marketing_channel_type not null,
  base_url text,
  utm_source text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, channel_key),
  unique (id, company_id)
);

create table public.marketing_listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  vehicle_id uuid not null,
  channel_id uuid,
  listing_number text not null,
  title text not null,
  short_description text,
  full_description text,
  specifications jsonb not null default '{}'::jsonb,
  price numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  export_available boolean not null default false,
  status public.marketing_listing_status not null default 'draft',
  external_url text,
  lead_count integer not null default 0,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, listing_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  foreign key (channel_id, company_id) references public.listing_channels(id, company_id) on delete set null (channel_id),
  constraint marketing_listings_price_check check (price >= 0),
  constraint marketing_listings_lead_count_check check (lead_count >= 0)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  channel_id uuid,
  campaign_number text not null,
  name text not null,
  objective text not null default 'lead_generation',
  status public.campaign_status not null default 'draft',
  budget numeric(14,2) not null default 0,
  spend numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  start_date date,
  end_date date,
  impressions integer not null default 0,
  clicks integer not null default 0,
  leads integer not null default 0,
  conversions integer not null default 0,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, campaign_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (channel_id, company_id) references public.listing_channels(id, company_id) on delete set null (channel_id),
  constraint campaigns_money_check check (budget >= 0 and spend >= 0),
  constraint campaigns_metrics_check check (impressions >= 0 and clicks >= 0 and leads >= 0 and conversions >= 0)
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  vehicle_id uuid,
  listing_id uuid,
  campaign_id uuid,
  channel_id uuid,
  post_number text not null,
  channel_type public.marketing_channel_type not null default 'instagram',
  caption text not null,
  hashtags text[] not null default '{}'::text[],
  call_to_action text,
  script text,
  media_notes text,
  status public.social_post_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_url text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, post_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (listing_id, company_id) references public.marketing_listings(id, company_id) on delete set null (listing_id),
  foreign key (campaign_id, company_id) references public.campaigns(id, company_id) on delete set null (campaign_id),
  foreign key (channel_id, company_id) references public.listing_channels(id, company_id) on delete set null (channel_id)
);

create table public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  listing_id uuid,
  social_post_id uuid,
  campaign_id uuid,
  title text not null,
  calendar_date date not null,
  start_time time,
  status public.content_calendar_status not null default 'planned',
  owner_profile_id uuid references public.profiles(id),
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (listing_id, company_id) references public.marketing_listings(id, company_id) on delete set null (listing_id),
  foreign key (social_post_id, company_id) references public.social_posts(id, company_id) on delete set null (social_post_id),
  foreign key (campaign_id, company_id) references public.campaigns(id, company_id) on delete set null (campaign_id)
);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_key text not null,
  name text not null,
  channel_type public.marketing_channel_type not null default 'other',
  monthly_leads integer not null default 0,
  monthly_spend numeric(14,2) not null default 0,
  monthly_conversions integer not null default 0,
  currency_code char(3) not null default 'AED',
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, source_key),
  unique (id, company_id),
  constraint lead_sources_metrics_check check (monthly_leads >= 0 and monthly_spend >= 0 and monthly_conversions >= 0)
);

create trigger listing_channels_set_updated_at before update on public.listing_channels for each row execute function public.set_updated_at();
create trigger marketing_listings_set_updated_at before update on public.marketing_listings for each row execute function public.set_updated_at();
create trigger social_posts_set_updated_at before update on public.social_posts for each row execute function public.set_updated_at();
create trigger campaigns_set_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger content_calendar_set_updated_at before update on public.content_calendar for each row execute function public.set_updated_at();
create trigger lead_sources_set_updated_at before update on public.lead_sources for each row execute function public.set_updated_at();

create or replace function app_private.sync_vehicle_marketing_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_vehicle_id uuid;
  target_company_id uuid;
  website_status public.vehicle_listing_status;
  social_status public.vehicle_listing_status;
begin
  target_vehicle_id := coalesce(new.vehicle_id, old.vehicle_id);
  target_company_id := coalesce(new.company_id, old.company_id);

  if target_vehicle_id is null or target_company_id is null then
    return coalesce(new, old);
  end if;

  select case
      when exists (
        select 1 from public.marketing_listings ml
        where ml.company_id = target_company_id
          and ml.vehicle_id = target_vehicle_id
          and ml.deleted_at is null
          and ml.status = 'active'
      ) then 'listed'::public.vehicle_listing_status
      when exists (
        select 1 from public.marketing_listings ml
        where ml.company_id = target_company_id
          and ml.vehicle_id = target_vehicle_id
          and ml.deleted_at is null
          and ml.status = 'draft'
      ) then 'draft'::public.vehicle_listing_status
      when exists (
        select 1 from public.marketing_listings ml
        where ml.company_id = target_company_id
          and ml.vehicle_id = target_vehicle_id
          and ml.deleted_at is null
          and ml.status = 'paused'
      ) then 'paused'::public.vehicle_listing_status
      when exists (
        select 1 from public.marketing_listings ml
        where ml.company_id = target_company_id
          and ml.vehicle_id = target_vehicle_id
          and ml.deleted_at is null
          and ml.status = 'sold'
      ) then 'sold'::public.vehicle_listing_status
      else 'not_listed'::public.vehicle_listing_status
    end
  into website_status;

  select case
      when exists (
        select 1 from public.social_posts sp
        where sp.company_id = target_company_id
          and sp.vehicle_id = target_vehicle_id
          and sp.deleted_at is null
          and sp.status = 'published'
      ) then 'listed'::public.vehicle_listing_status
      when exists (
        select 1 from public.social_posts sp
        where sp.company_id = target_company_id
          and sp.vehicle_id = target_vehicle_id
          and sp.deleted_at is null
          and sp.status in ('draft', 'scheduled')
      ) then 'draft'::public.vehicle_listing_status
      else 'not_listed'::public.vehicle_listing_status
    end
  into social_status;

  update public.vehicles
  set website_listing_status = website_status,
      social_media_status = social_status,
      updated_at = now()
  where id = target_vehicle_id
    and company_id = target_company_id;

  return coalesce(new, old);
end;
$$;

create trigger marketing_listings_sync_vehicle_status
  after insert or update or delete on public.marketing_listings
  for each row execute function app_private.sync_vehicle_marketing_status();

create trigger social_posts_sync_vehicle_status
  after insert or update or delete on public.social_posts
  for each row execute function app_private.sync_vehicle_marketing_status();

create index listing_channels_company_type_idx on public.listing_channels(company_id, channel_type) where deleted_at is null;
create index marketing_listings_company_status_idx on public.marketing_listings(company_id, status) where deleted_at is null;
create index marketing_listings_company_vehicle_idx on public.marketing_listings(company_id, vehicle_id) where deleted_at is null;
create index social_posts_company_status_idx on public.social_posts(company_id, status) where deleted_at is null;
create index social_posts_company_vehicle_idx on public.social_posts(company_id, vehicle_id) where deleted_at is null;
create index campaigns_company_status_idx on public.campaigns(company_id, status) where deleted_at is null;
create index content_calendar_company_date_idx on public.content_calendar(company_id, calendar_date) where deleted_at is null;
create index lead_sources_company_active_idx on public.lead_sources(company_id, active) where deleted_at is null;

grant select, insert, update, delete on public.listing_channels to authenticated;
grant select, insert, update, delete on public.marketing_listings to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.content_calendar to authenticated;
grant select, insert, update, delete on public.lead_sources to authenticated;

alter table public.listing_channels enable row level security;
alter table public.marketing_listings enable row level security;
alter table public.social_posts enable row level security;
alter table public.campaigns enable row level security;
alter table public.content_calendar enable row level security;
alter table public.lead_sources enable row level security;

create policy "listing_channels_select_marketers" on public.listing_channels
  for select to authenticated
  using (deleted_at is null and app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "listing_channels_manage_marketers" on public.listing_channels
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "marketing_listings_select_marketers" on public.marketing_listings
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "marketing_listings_manage_marketers" on public.marketing_listings
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "social_posts_select_marketers" on public.social_posts
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "social_posts_manage_marketers" on public.social_posts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "campaigns_select_marketers" on public.campaigns
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "campaigns_manage_marketers" on public.campaigns
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "content_calendar_select_marketers" on public.content_calendar
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_marketing')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "content_calendar_manage_marketers" on public.content_calendar
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "lead_sources_select_marketers" on public.lead_sources
  for select to authenticated
  using (deleted_at is null and app_private.has_company_permission(company_id, 'manage_marketing'));

create policy "lead_sources_manage_marketers" on public.lead_sources
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_marketing'))
  with check (app_private.has_company_permission(company_id, 'manage_marketing'));

insert into public.listing_channels (company_id, channel_key, name, channel_type, utm_source)
select c.id, seed.channel_key, seed.name, seed.channel_type::public.marketing_channel_type, seed.utm_source
from public.companies c
cross join (values
  ('website', 'Website', 'website', 'website'),
  ('instagram', 'Instagram', 'instagram', 'instagram'),
  ('facebook', 'Facebook', 'facebook', 'facebook'),
  ('tiktok', 'TikTok', 'tiktok', 'tiktok'),
  ('linkedin', 'LinkedIn', 'linkedin', 'linkedin'),
  ('whatsapp', 'WhatsApp Broadcast', 'whatsapp', 'whatsapp'),
  ('marketplace', 'Marketplace', 'marketplace', 'marketplace'),
  ('export_portal', 'Export Portal', 'export_portal', 'export_portal')
) as seed(channel_key, name, channel_type, utm_source)
on conflict (company_id, channel_key) do nothing;

insert into public.lead_sources (company_id, source_key, name, channel_type, currency_code)
select c.id, seed.source_key, seed.name, seed.channel_type::public.marketing_channel_type, c.primary_currency_code
from public.companies c
cross join (values
  ('instagram', 'Instagram', 'instagram'),
  ('facebook', 'Facebook', 'facebook'),
  ('tiktok', 'TikTok', 'tiktok'),
  ('website', 'Website', 'website'),
  ('whatsapp', 'WhatsApp', 'whatsapp'),
  ('linkedin', 'LinkedIn', 'linkedin'),
  ('referral', 'Referral', 'other'),
  ('showroom_visit', 'Showroom Visit', 'other'),
  ('export_inquiry', 'Export Inquiry', 'export_portal')
) as seed(source_key, name, channel_type)
on conflict (company_id, source_key) do nothing;

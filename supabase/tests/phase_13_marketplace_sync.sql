begin;

select plan(7);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'marketplace_channels',
        'listing_price_overrides',
        'listing_sync_jobs',
        'listing_sync_logs',
        'marketplace_leads'
      )
      and rowsecurity is false
  ),
  'all phase 13 marketplace tables have RLS enabled'
);

select ok(
  exists(select 1 from public.marketplace_channels where channel_key = 'dubizzle')
  and exists(select 1 from public.marketplace_channels where channel_key = 'facebook_marketplace'),
  'default marketplace channels are seeded for existing companies'
);

create temp table marketplace_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as vehicle_a,
       gen_random_uuid() as vehicle_b,
       gen_random_uuid() as listing_a,
       gen_random_uuid() as listing_b,
       gen_random_uuid() as channel_a,
       gen_random_uuid() as channel_b;

grant select on marketplace_probe_ids to authenticated;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
select user_a,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'marketplace-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from marketplace_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'marketplace-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from marketplace_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Marketplace Company A', 'marketplace-company-a' from marketplace_probe_ids
union all
select company_b, 'Marketplace Company B', 'marketplace-company-b' from marketplace_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Marketplace Branch A', 'MPA', 'Dubai', 'AED' from marketplace_probe_ids
union all
select branch_b, company_b, 'Marketplace Branch B', 'MPB', 'Doha', 'QAR' from marketplace_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from marketplace_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from marketplace_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from marketplace_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from marketplace_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Marketplace Manager A', 'marketplace_manager_a', 'Marketplace manager test role.', true from marketplace_probe_ids
union all
select role_b, company_b, 'Marketplace Manager B', 'marketplace_manager_b', 'Marketplace manager test role.', true from marketplace_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from marketplace_probe_ids ids
join public.permissions p on p.permission_key in ('manage_marketing', 'view_vehicles')
union all
select ids.company_b, ids.role_b, p.id
from marketplace_probe_ids ids
join public.permissions p on p.permission_key in ('manage_marketing', 'view_vehicles');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from marketplace_probe_ids
union all
select company_b, user_b, role_b from marketplace_probe_ids;

insert into public.vehicles (
  id,
  company_id,
  branch_id,
  stock_number,
  vin,
  brand,
  model,
  year,
  purchase_price,
  selling_price,
  currency_code,
  status
)
select vehicle_a, company_a, branch_a, 'MP-A-001', 'MARKETPLACEVINA01', 'Toyota', 'Hilux', 2026, 100000, 150000, 'AED', 'available'::public.vehicle_status
from marketplace_probe_ids
union all
select vehicle_b, company_b, branch_b, 'MP-B-001', 'MARKETPLACEVINB01', 'Nissan', 'Patrol', 2026, 120000, 180000, 'QAR', 'available'::public.vehicle_status
from marketplace_probe_ids;

insert into public.marketing_listings (
  id,
  company_id,
  branch_id,
  vehicle_id,
  listing_number,
  title,
  price,
  currency_code,
  status,
  created_by
)
select listing_a, company_a, branch_a, vehicle_a, 'LST-MP-A-001', 'A marketplace listing', 150000, 'AED', 'active'::public.marketing_listing_status, user_a
from marketplace_probe_ids
union all
select listing_b, company_b, branch_b, vehicle_b, 'LST-MP-B-001', 'B marketplace listing', 180000, 'QAR', 'active'::public.marketing_listing_status, user_b
from marketplace_probe_ids;

insert into public.marketplace_channels (id, company_id, channel_key, name, provider, channel_type)
select channel_a, company_a, 'dubizzle', 'Dubizzle A', 'dubizzle', 'marketplace'::public.marketing_channel_type from marketplace_probe_ids
union all
select channel_b, company_b, 'dubizzle', 'Dubizzle B', 'dubizzle', 'marketplace'::public.marketing_channel_type from marketplace_probe_ids;

insert into public.listing_price_overrides (
  company_id,
  branch_id,
  listing_id,
  marketplace_channel_id,
  override_price,
  currency_code,
  reason,
  created_by
)
select company_b, branch_b, listing_b, channel_b, 175000, 'QAR', 'Tenant isolation row', user_b
from marketplace_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from marketplace_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(channel_key order by channel_key) from public.marketplace_channels where channel_key = 'dubizzle'),
  array['dubizzle']::text[],
  'marketplace RLS only exposes current company channels'
);

insert into public.listing_price_overrides (
  company_id,
  branch_id,
  listing_id,
  marketplace_channel_id,
  override_price,
  currency_code,
  reason,
  created_by
)
select company_a, branch_a, listing_a, channel_a, 146500, 'AED', 'Ramadan offer', user_a
from marketplace_probe_ids;

select is(
  (select override_price::numeric(14,2) from public.listing_price_overrides where reason = 'Ramadan offer'),
  146500.00::numeric(14,2),
  'authorized marketer can insert channel price override'
);

insert into public.listing_sync_jobs (
  company_id,
  branch_id,
  listing_id,
  marketplace_channel_id,
  operation,
  status,
  external_reference,
  created_by
)
select company_a, branch_a, listing_a, channel_a, 'publish'::public.listing_sync_operation, 'queued'::public.listing_sync_status, 'dubizzle-LST-MP-A-001', user_a
from marketplace_probe_ids;

select is(
  (select status::text from public.listing_sync_jobs where external_reference = 'dubizzle-LST-MP-A-001'),
  'queued',
  'authorized marketer can queue listing sync job'
);

insert into public.listing_sync_logs (
  company_id,
  branch_id,
  sync_job_id,
  listing_id,
  marketplace_channel_id,
  severity,
  message,
  created_by
)
select j.company_id, j.branch_id, j.id, j.listing_id, j.marketplace_channel_id, 'info'::public.listing_sync_log_severity, 'Queued for provider publish.', ids.user_a
from public.listing_sync_jobs j
cross join marketplace_probe_ids ids
where j.external_reference = 'dubizzle-LST-MP-A-001';

select is(
  (select message from public.listing_sync_logs where message = 'Queued for provider publish.'),
  'Queued for provider publish.',
  'authorized marketer can write sync log'
);

insert into public.marketplace_leads (
  company_id,
  branch_id,
  marketplace_channel_id,
  listing_id,
  vehicle_id,
  lead_name,
  phone,
  message,
  budget,
  currency_code,
  created_by
)
select company_a, branch_a, channel_a, listing_a, vehicle_a, 'Dubizzle Buyer', '+971500000000', 'Interested in export.', 145000, 'AED', user_a
from marketplace_probe_ids;

select is(
  (select lead_count from public.marketing_listings where listing_number = 'LST-MP-A-001'),
  1,
  'marketplace lead increments listing lead count'
);

reset role;

select * from finish();

rollback;

begin;

select plan(6);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'listing_channels',
        'marketing_listings',
        'social_posts',
        'campaigns',
        'content_calendar',
        'lead_sources'
      )
      and rowsecurity is false
  ),
  'all phase 8 marketing tables have RLS enabled'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'manage_marketing'),
  'marketing permission exists'
);

select ok(
  exists(select 1 from public.listing_channels where channel_key = 'instagram')
  and exists(select 1 from public.lead_sources where source_key = 'export_inquiry'),
  'default marketing channels and lead sources are seeded for existing companies'
);

create temp table marketing_probe_ids as
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
       gen_random_uuid() as channel_a,
       gen_random_uuid() as channel_b;

grant select on marketing_probe_ids to authenticated;

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
       'marketing-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from marketing_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'marketing-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from marketing_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Marketing Company A', 'marketing-company-a' from marketing_probe_ids
union all
select company_b, 'Marketing Company B', 'marketing-company-b' from marketing_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Marketing Branch A', 'MKA', 'Dubai', 'AED' from marketing_probe_ids
union all
select branch_b, company_b, 'Marketing Branch B', 'MKB', 'Doha', 'QAR' from marketing_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from marketing_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from marketing_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from marketing_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from marketing_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Marketing Manager A', 'marketing_manager_a', 'Marketing manager test role.', true from marketing_probe_ids
union all
select role_b, company_b, 'Marketing Manager B', 'marketing_manager_b', 'Marketing manager test role.', true from marketing_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from marketing_probe_ids ids
join public.permissions p on p.permission_key in ('manage_marketing', 'manage_company_settings', 'view_vehicles')
union all
select ids.company_b, ids.role_b, p.id
from marketing_probe_ids ids
join public.permissions p on p.permission_key in ('manage_marketing', 'manage_company_settings', 'view_vehicles');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from marketing_probe_ids
union all
select company_b, user_b, role_b from marketing_probe_ids;

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
select vehicle_a, company_a, branch_a, 'MKT-A-001', 'MARKETINGVINA0001', 'Toyota', 'Hilux', 2026, 100000, 150000, 'AED', 'available'::public.vehicle_status
from marketing_probe_ids
union all
select vehicle_b, company_b, branch_b, 'MKT-B-001', 'MARKETINGVINB0001', 'Nissan', 'Patrol', 2026, 120000, 180000, 'QAR', 'available'::public.vehicle_status
from marketing_probe_ids;

insert into public.listing_channels (id, company_id, channel_key, name, channel_type)
select channel_a, company_a, 'website', 'Website', 'website'::public.marketing_channel_type from marketing_probe_ids
union all
select channel_b, company_b, 'website', 'Website', 'website'::public.marketing_channel_type from marketing_probe_ids;

insert into public.marketing_listings (
  company_id,
  branch_id,
  vehicle_id,
  channel_id,
  listing_number,
  title,
  price,
  currency_code,
  status,
  created_by
)
select company_a, branch_a, vehicle_a, channel_a, 'LST-MKT-A-001', 'A listing', 150000, 'AED', 'draft'::public.marketing_listing_status, user_a
from marketing_probe_ids
union all
select company_b, branch_b, vehicle_b, channel_b, 'LST-MKT-B-001', 'B listing', 180000, 'QAR', 'draft'::public.marketing_listing_status, user_b
from marketing_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from marketing_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(listing_number order by listing_number) from public.marketing_listings where listing_number like 'LST-MKT-%'),
  array['LST-MKT-A-001']::text[],
  'marketing RLS only exposes current company listings'
);

update public.marketing_listings
set status = 'active'::public.marketing_listing_status
where listing_number = 'LST-MKT-A-001';

select is(
  (select website_listing_status::text from public.vehicles where stock_number = 'MKT-A-001'),
  'listed',
  'active marketing listing updates vehicle website listing status'
);

insert into public.social_posts (
  company_id,
  branch_id,
  vehicle_id,
  channel_id,
  post_number,
  channel_type,
  caption,
  status,
  created_by
)
select company_a, branch_a, vehicle_a, channel_a, 'POST-MKT-A-001', 'instagram'::public.marketing_channel_type, 'New Hilux available.', 'published'::public.social_post_status, user_a
from marketing_probe_ids;

select is(
  (select social_media_status::text from public.vehicles where stock_number = 'MKT-A-001'),
  'listed',
  'published social post updates vehicle social media status'
);

reset role;

select * from finish();

rollback;

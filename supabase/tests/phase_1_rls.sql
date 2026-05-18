begin;

select plan(5);

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
  not exists(select 1 from pg_tables where schemaname = 'public' and rowsecurity is false),
  'all public tables have RLS enabled'
);

create temp table probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b;

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
       'rls-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'rls-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'RLS Company A', 'rls-company-a' from probe_ids
union all
select company_b, 'RLS Company B', 'rls-company-b' from probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(slug order by slug) from public.companies),
  array['rls-company-a']::text[],
  'authenticated company member only sees own company'
);

reset role;

select * from finish();

rollback;

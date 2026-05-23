begin;

select plan(4);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'business_role'
  ),
  'profiles store a business role category'
);

select ok(
  exists (
    select 1
    from public.companies c
    join public.roles r on r.company_id = c.id
    where c.slug = 'pollux-motors'
      and r.role_key in ('accountant', 'salesperson', 'general_manager', 'parts_manager', 'service_manager')
    group by c.id
    having count(distinct r.role_key) = 5
  ),
  'seed companies receive default dealership role templates'
);

select ok(
  exists (
    select 1
    from public.companies c
    join public.roles r on r.company_id = c.id and r.role_key = 'accountant'
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where c.slug = 'pollux-motors'
      and p.permission_key in ('record_payment', 'manage_finance', 'view_accounting', 'manage_accounting', 'manage_suppliers')
    group by r.id
    having count(distinct p.permission_key) = 5
  ),
  'accountant default role has finance, accounting, payment, and supplier permissions'
);

select ok(
  not exists (
    select 1
    from public.roles r
    join public.permissions p on true
    left join public.role_permissions rp on rp.role_id = r.id and rp.permission_id = p.id
    where r.role_key = 'company_owner'
      and r.deleted_at is null
      and rp.id is null
  ),
  'company owner roles have every configured permission'
);

select * from finish();

rollback;

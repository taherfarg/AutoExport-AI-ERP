begin;

select plan(7);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'gl_accounts',
        'accounting_periods',
        'journal_entries',
        'journal_entry_lines',
        'tax_rates',
        'tax_reports',
        'bank_transactions',
        'bank_reconciliations',
        'accounting_exports'
      )
      and rowsecurity is false
  ),
  'all phase 17 accounting tables have RLS enabled'
);

select ok(
  exists(select 1 from public.modules where module_key = 'accounting')
  and exists(select 1 from public.permissions where permission_key = 'view_accounting')
  and exists(select 1 from public.permissions where permission_key = 'manage_accounting')
  and exists(select 1 from public.permissions where permission_key = 'export_accounting'),
  'accounting module and permissions are seeded'
);

create temp table accounting_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as journal_a,
       gen_random_uuid() as journal_unbalanced;

grant select on accounting_probe_ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'accounting-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from accounting_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'accounting-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from accounting_probe_ids;

insert into public.companies (id, name, slug, primary_currency_code)
select company_a, 'Accounting Company A', 'accounting-company-a', 'AED' from accounting_probe_ids
union all
select company_b, 'Accounting Company B', 'accounting-company-b', 'QAR' from accounting_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Accounting Branch A', 'ABA', 'Dubai', 'AED' from accounting_probe_ids
union all
select branch_b, company_b, 'Accounting Branch B', 'ABB', 'Doha', 'QAR' from accounting_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from accounting_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from accounting_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from accounting_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from accounting_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Accounting Admin A', 'accounting_admin_a', 'Accounting role A', true from accounting_probe_ids
union all
select role_b, company_b, 'Accounting Admin B', 'accounting_admin_b', 'Accounting role B', true from accounting_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from accounting_probe_ids ids
join public.permissions p on p.permission_key in ('view_accounting', 'manage_accounting', 'export_accounting', 'view_finance')
union all
select ids.company_b, ids.role_b, p.id
from accounting_probe_ids ids
join public.permissions p on p.permission_key in ('view_accounting', 'manage_accounting', 'export_accounting', 'view_finance');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from accounting_probe_ids
union all
select company_b, user_b, role_b from accounting_probe_ids;

select is(
  (select count(*)::integer from public.gl_accounts ga join accounting_probe_ids ids on ids.company_a = ga.company_id),
  12::integer,
  'new companies receive the default chart of accounts'
);

select set_config('request.jwt.claim.sub', (select user_a::text from accounting_probe_ids), true);
set local role authenticated;

select is(
  (select count(*)::integer from public.gl_accounts ga join accounting_probe_ids ids on ids.company_b = ga.company_id),
  0::integer,
  'user_a cannot read company_b GL accounts'
);

insert into public.journal_entries (id, company_id, branch_id, entry_number, entry_date, memo, currency_code)
select journal_a, company_a, branch_a, 'JE-A-001', current_date, 'Opening vehicle inventory balance', 'AED'
from accounting_probe_ids;

insert into public.journal_entry_lines (company_id, journal_entry_id, gl_account_id, branch_id, description, debit_amount, credit_amount, currency_code, line_order)
select ids.company_a, ids.journal_a, debit_account.id, ids.branch_a, 'Vehicle inventory', 25000, 0, 'AED', 1
from accounting_probe_ids ids
join public.gl_accounts debit_account on debit_account.company_id = ids.company_a and debit_account.system_key = 'vehicle_inventory'
union all
select ids.company_a, ids.journal_a, credit_account.id, ids.branch_a, 'Owner equity', 0, 25000, 'AED', 2
from accounting_probe_ids ids
join public.gl_accounts credit_account on credit_account.company_id = ids.company_a and credit_account.system_key = 'owner_equity';

update public.journal_entries
set status = 'posted'::public.journal_entry_status
where entry_number = 'JE-A-001';

select is(
  (select status::text from public.journal_entries where entry_number = 'JE-A-001'),
  'posted',
  'balanced journal entries can be posted'
);

insert into public.journal_entries (id, company_id, branch_id, entry_number, entry_date, memo, currency_code)
select journal_unbalanced, company_a, branch_a, 'JE-A-002', current_date, 'Unbalanced journal test', 'AED'
from accounting_probe_ids;

insert into public.journal_entry_lines (company_id, journal_entry_id, gl_account_id, branch_id, description, debit_amount, credit_amount, currency_code, line_order)
select ids.company_a, ids.journal_unbalanced, debit_account.id, ids.branch_a, 'Debit side', 100, 0, 'AED', 1
from accounting_probe_ids ids
join public.gl_accounts debit_account on debit_account.company_id = ids.company_a and debit_account.system_key = 'cash_on_hand'
union all
select ids.company_a, ids.journal_unbalanced, credit_account.id, ids.branch_a, 'Credit side', 0, 90, 'AED', 2
from accounting_probe_ids ids
join public.gl_accounts credit_account on credit_account.company_id = ids.company_a and credit_account.system_key = 'owner_equity';

select throws_ok(
  $$ update public.journal_entries set status = 'posted'::public.journal_entry_status where entry_number = 'JE-A-002' $$,
  'Journal entry must be balanced before posting',
  'unbalanced journal posting is rejected'
);

insert into public.accounting_exports (company_id, export_number, export_format, period_start, period_end, requested_by)
select company_a, 'AEXP-A-001', 'csv'::public.accounting_export_format, current_date - 30, current_date, user_a
from accounting_probe_ids;

select is(
  (select export_format::text from public.accounting_exports where export_number = 'AEXP-A-001'),
  'csv',
  'accounting export records can be created for own tenant'
);

reset role;

select * from finish();

rollback;

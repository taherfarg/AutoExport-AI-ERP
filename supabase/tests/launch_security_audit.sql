begin;

select plan(4);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and rowsecurity is false
      and tablename not like 'pgtap%'
  ),
  'all public tables have RLS enabled'
);

select ok(
  not exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  'anon has no direct table privileges on public tables'
);

select ok(
  not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'app_private'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  'anon cannot execute app_private routines'
);

select ok(
  not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'app_private'
      and grantee = 'public'
      and privilege_type = 'EXECUTE'
  ),
  'public cannot execute app_private routines'
);

select * from finish();

rollback;

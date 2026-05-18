create or replace function app_private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid()
$$;

create or replace function app_private.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = target_company_id
      and cm.profile_id = app_private.current_profile_id()
      and cm.status = 'active'
  )
$$;

create or replace function app_private.has_company_permission(target_company_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r
      on r.id = ur.role_id
      and r.company_id = ur.company_id
    join public.role_permissions rp
      on rp.role_id = ur.role_id
      and rp.company_id = ur.company_id
    join public.permissions p on p.id = rp.permission_id
    where ur.company_id = target_company_id
      and r.company_id = target_company_id
      and ur.profile_id = app_private.current_profile_id()
      and ur.deleted_at is null
      and r.deleted_at is null
      and p.permission_key = target_permission_key
  )
$$;

create or replace function app_private.can_access_branch(target_company_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select target_branch_id is null
    or app_private.has_company_permission(target_company_id, 'manage_company_settings')
    or exists (
      select 1
      from public.branch_memberships bm
      where bm.company_id = target_company_id
        and bm.branch_id = target_branch_id
        and bm.profile_id = app_private.current_profile_id()
        and bm.status = 'active'
    )
$$;

revoke all on schema app_private from public, anon, authenticated;
revoke execute on function app_private.current_profile_id() from public, anon, authenticated;
revoke execute on function app_private.is_company_member(uuid) from public, anon, authenticated;
revoke execute on function app_private.has_company_permission(uuid, text) from public, anon, authenticated;
revoke execute on function app_private.can_access_branch(uuid, uuid) from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_profile_id() to authenticated;
grant execute on function app_private.is_company_member(uuid) to authenticated;
grant execute on function app_private.has_company_permission(uuid, text) to authenticated;
grant execute on function app_private.can_access_branch(uuid, uuid) to authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.company_memberships enable row level security;
alter table public.branch_memberships enable row level security;
alter table public.modules enable row level security;
alter table public.packages enable row level security;
alter table public.package_modules enable row level security;
alter table public.subscriptions enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.company_settings enable row level security;
alter table public.branch_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_company_members" on public.profiles
  for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or exists (
      select 1
      from public.company_memberships own_membership
      join public.company_memberships target_membership
        on target_membership.company_id = own_membership.company_id
      where own_membership.profile_id = app_private.current_profile_id()
        and own_membership.status = 'active'
        and target_membership.profile_id = profiles.id
        and target_membership.status in ('active', 'invited')
    )
  );

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create policy "companies_select_member" on public.companies
  for select to authenticated
  using (app_private.is_company_member(id) and deleted_at is null);

create policy "companies_insert_authenticated" on public.companies
  for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "companies_update_admin" on public.companies
  for update to authenticated
  using (app_private.has_company_permission(id, 'manage_company_settings'))
  with check (app_private.has_company_permission(id, 'manage_company_settings'));

create policy "company_memberships_select_member" on public.company_memberships
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "company_memberships_manage_users" on public.company_memberships
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "branches_select_accessible" on public.branches
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, id)
    and deleted_at is null
  );

create policy "branches_manage_company_settings" on public.branches
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_company_settings'))
  with check (app_private.has_company_permission(company_id, 'manage_company_settings'));

create policy "branch_memberships_select_member" on public.branch_memberships
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "branch_memberships_manage_users" on public.branch_memberships
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "modules_select_authenticated" on public.modules
  for select to authenticated
  using (true);

create policy "packages_select_authenticated" on public.packages
  for select to authenticated
  using (true);

create policy "package_modules_select_authenticated" on public.package_modules
  for select to authenticated
  using (true);

create policy "permissions_select_authenticated" on public.permissions
  for select to authenticated
  using (true);

create policy "subscriptions_select_member" on public.subscriptions
  for select to authenticated
  using (app_private.is_company_member(company_id) and deleted_at is null);

create policy "subscriptions_manage_subscription" on public.subscriptions
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_subscriptions'))
  with check (app_private.has_company_permission(company_id, 'manage_subscriptions'));

create policy "roles_select_member" on public.roles
  for select to authenticated
  using (app_private.is_company_member(company_id) and deleted_at is null);

create policy "roles_manage_users" on public.roles
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "role_permissions_select_member" on public.role_permissions
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "role_permissions_manage_users" on public.role_permissions
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "user_roles_select_member" on public.user_roles
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
  );

create policy "user_roles_manage_users" on public.user_roles
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_users'))
  with check (app_private.has_company_permission(company_id, 'manage_users'));

create policy "company_settings_select_member" on public.company_settings
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "company_settings_manage" on public.company_settings
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_company_settings'))
  with check (app_private.has_company_permission(company_id, 'manage_company_settings'));

create policy "branch_settings_select_member" on public.branch_settings
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "branch_settings_manage_company_settings" on public.branch_settings
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_company_settings'))
  with check (app_private.has_company_permission(company_id, 'manage_company_settings'));

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, branch_id)
    and profile_id = app_private.current_profile_id()
    and deleted_at is null
  );

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (
    app_private.is_company_member(company_id)
    and profile_id = app_private.current_profile_id()
    and deleted_at is null
  )
  with check (
    app_private.is_company_member(company_id)
    and profile_id = app_private.current_profile_id()
  );

create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using (
    company_id is not null
    and app_private.has_company_permission(company_id, 'view_audit_logs')
  );

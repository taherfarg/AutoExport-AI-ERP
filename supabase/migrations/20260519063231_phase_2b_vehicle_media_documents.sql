insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-media',
  'vehicle-media',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.vehicle_document_checklists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  document_type text not null,
  title text not null,
  is_required boolean not null default true,
  is_export_required boolean not null default false,
  status public.vehicle_document_status not null default 'missing',
  vehicle_document_id uuid,
  due_at date,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, vehicle_id, document_type),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  foreign key (vehicle_document_id) references public.vehicle_documents(id) on delete set null
);

create trigger vehicle_document_checklists_set_updated_at
  before update on public.vehicle_document_checklists
  for each row execute function public.set_updated_at();

create index vehicle_document_checklists_company_vehicle_idx
  on public.vehicle_document_checklists(company_id, vehicle_id);

create index vehicle_document_checklists_status_idx
  on public.vehicle_document_checklists(company_id, status);

create or replace function public.refresh_vehicle_media_status(target_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_company_id uuid;
  photo_count integer;
  checklist_count integer;
  completed_checklist_count integer;
  verified_checklist_count integer;
begin
  select company_id into target_company_id
  from public.vehicles
  where id = target_vehicle_id;

  if target_company_id is null then
    return;
  end if;

  select count(*) into photo_count
  from public.vehicle_photos
  where vehicle_id = target_vehicle_id
    and company_id = target_company_id
    and deleted_at is null;

  select count(*),
         count(*) filter (where status in ('complete', 'verified')),
         count(*) filter (where status = 'verified')
    into checklist_count, completed_checklist_count, verified_checklist_count
  from public.vehicle_document_checklists
  where vehicle_id = target_vehicle_id
    and company_id = target_company_id
    and is_required = true;

  update public.vehicles
  set
    photos_status = case
      when photo_count = 0 then 'missing'::public.vehicle_photo_status
      when photo_count < 4 then 'partial'::public.vehicle_photo_status
      else 'complete'::public.vehicle_photo_status
    end,
    documents_status = case
      when checklist_count = 0 then 'missing'::public.vehicle_document_status
      when verified_checklist_count = checklist_count then 'verified'::public.vehicle_document_status
      when completed_checklist_count = checklist_count then 'complete'::public.vehicle_document_status
      when completed_checklist_count > 0 then 'partial'::public.vehicle_document_status
      else 'missing'::public.vehicle_document_status
    end
  where id = target_vehicle_id
    and company_id = target_company_id;
end;
$$;

create or replace function public.refresh_vehicle_media_status_from_photo()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_vehicle_media_status(coalesce(new.vehicle_id, old.vehicle_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_vehicle_media_status_from_document()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_vehicle_media_status(coalesce(new.vehicle_id, old.vehicle_id));
  return coalesce(new, old);
end;
$$;

create trigger vehicle_photos_refresh_vehicle_media_status
  after insert or update or delete on public.vehicle_photos
  for each row execute function public.refresh_vehicle_media_status_from_photo();

create trigger vehicle_document_checklists_refresh_vehicle_media_status
  after insert or update or delete on public.vehicle_document_checklists
  for each row execute function public.refresh_vehicle_media_status_from_document();

create or replace function public.seed_vehicle_document_checklist(
  target_company_id uuid,
  target_vehicle_id uuid,
  actor_profile_id uuid default null
)
returns void
language plpgsql
as $$
begin
  insert into public.vehicle_document_checklists (
    company_id,
    vehicle_id,
    document_type,
    title,
    is_required,
    is_export_required,
    created_by,
    updated_by
  )
  values
    (target_company_id, target_vehicle_id, 'vehicle_title', 'Vehicle title', true, true, actor_profile_id, actor_profile_id),
    (target_company_id, target_vehicle_id, 'purchase_invoice', 'Purchase invoice', true, false, actor_profile_id, actor_profile_id),
    (target_company_id, target_vehicle_id, 'inspection_report', 'Inspection report', true, true, actor_profile_id, actor_profile_id),
    (target_company_id, target_vehicle_id, 'insurance', 'Insurance', false, false, actor_profile_id, actor_profile_id),
    (target_company_id, target_vehicle_id, 'export_certificate', 'Export certificate', false, true, actor_profile_id, actor_profile_id),
    (target_company_id, target_vehicle_id, 'certificate_of_origin', 'Certificate of origin', false, true, actor_profile_id, actor_profile_id),
    (target_company_id, target_vehicle_id, 'bill_of_lading', 'Bill of lading', false, true, actor_profile_id, actor_profile_id),
    (target_company_id, target_vehicle_id, 'customs_certificate', 'Customs certificate', false, true, actor_profile_id, actor_profile_id)
  on conflict (company_id, vehicle_id, document_type) do nothing;

  perform public.refresh_vehicle_media_status(target_vehicle_id);
end;
$$;

create or replace function public.seed_vehicle_document_checklist_on_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.seed_vehicle_document_checklist(new.company_id, new.id, new.created_by);
  return new;
end;
$$;

create trigger vehicles_seed_document_checklist
  after insert on public.vehicles
  for each row execute function public.seed_vehicle_document_checklist_on_insert();

insert into public.vehicle_document_checklists (
  company_id,
  vehicle_id,
  document_type,
  title,
  is_required,
  is_export_required
)
select
  v.company_id,
  v.id,
  template.document_type,
  template.title,
  template.is_required,
  template.is_export_required
from public.vehicles v
cross join (
  values
    ('vehicle_title', 'Vehicle title', true, true),
    ('purchase_invoice', 'Purchase invoice', true, false),
    ('inspection_report', 'Inspection report', true, true),
    ('insurance', 'Insurance', false, false),
    ('export_certificate', 'Export certificate', false, true),
    ('certificate_of_origin', 'Certificate of origin', false, true),
    ('bill_of_lading', 'Bill of lading', false, true),
    ('customs_certificate', 'Customs certificate', false, true)
) as template(document_type, title, is_required, is_export_required)
on conflict (company_id, vehicle_id, document_type) do nothing;

grant select, insert, update, delete on public.vehicle_document_checklists to authenticated;

alter table public.vehicle_document_checklists enable row level security;

create policy "vehicle_document_checklists_select_vehicle_viewers" on public.vehicle_document_checklists
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_vehicles')
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_document_checklists.vehicle_id
        and v.company_id = vehicle_document_checklists.company_id
        and app_private.can_access_branch(v.company_id, v.branch_id)
        and v.deleted_at is null
    )
  );

create policy "vehicle_document_checklists_insert_document_uploaders" on public.vehicle_document_checklists
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "vehicle_document_checklists_update_document_uploaders" on public.vehicle_document_checklists
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'upload_documents'))
  with check (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "vehicle_document_checklists_delete_document_uploaders" on public.vehicle_document_checklists
  for delete to authenticated
  using (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "vehicle_media_select_company_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-media'
    and app_private.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy "vehicle_media_insert_document_uploaders" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-media'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  );

create policy "vehicle_media_update_document_uploaders" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vehicle-media'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  )
  with check (
    bucket_id = 'vehicle-media'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  );

create policy "vehicle_media_delete_document_uploaders" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicle-media'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  );

select public.refresh_vehicle_media_status(id)
from public.vehicles;

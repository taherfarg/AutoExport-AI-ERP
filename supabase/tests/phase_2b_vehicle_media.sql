begin;

select plan(5);

select ok(
  exists(select 1 from storage.buckets where id = 'vehicle-media' and public is false),
  'vehicle-media bucket exists and is private'
);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'vehicle_document_checklists'
      and rowsecurity is true
  ),
  'vehicle_document_checklists has RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'vehicle_media_insert_document_uploaders'
  ),
  'vehicle media storage insert policy exists'
);

select is(
  (
    select count(*)
    from public.vehicle_document_checklists
    where document_type in ('vehicle_title', 'purchase_invoice', 'inspection_report')
  ) > 0,
  true,
  'seed vehicles have required checklist rows'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'vehicle_media_insert_document_uploaders'
      and with_check like '%foldername%'
      and with_check like '%upload_documents%'
  ),
  'storage insert policy checks company folder and upload permission'
);

select * from finish();

rollback;

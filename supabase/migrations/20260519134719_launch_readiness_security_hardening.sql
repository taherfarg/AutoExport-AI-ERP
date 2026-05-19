revoke select, insert, update, delete on all tables in schema public from anon;
alter default privileges in schema public revoke select, insert, update, delete on tables from anon;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

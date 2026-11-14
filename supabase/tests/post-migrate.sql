-- Applied after the migrations, for tests only.
--
-- Grants the privileges the hosted platform grants its own roles, so the
-- test database behaves like a real project: service_role reaches every
-- table (and bypasses row-level security), and every role can call the test
-- helpers.
--
-- This file is never applied to a real project.

grant usage on schema test to anon, authenticated, service_role;
grant execute on all functions in schema test to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage on schema public to service_role;

grant insert, update, delete on auth.users to service_role;

-- Exponer lek_core-tabeller via public-schema som views
-- Dette gjør at Supabase API (db_schema=public) kan nå LEK Core

drop view if exists public.lek_core_beekeepers;
drop view if exists public.lek_core_apiaries;
drop view if exists public.lek_core_hives;

create view public.lek_core_beekeepers as
select * from lek_core.beekeepers;

create view public.lek_core_apiaries as
select * from lek_core.apiaries;

create view public.lek_core_hives as
select * from lek_core.hives;


alter table public.inspections
add column if not exists queen_side smallint;

alter table public.inspections
add constraint if not exists inspections_queen_side_check
check (queen_side in (1, 2)) not valid;

alter table public.inspections
validate constraint inspections_queen_side_check;

create index if not exists inspections_hive_id_queen_side_created_at_idx
on public.inspections (hive_id, queen_side, created_at);

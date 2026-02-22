alter table lek_core.apiaries add column if not exists sequence_no integer;
with s as (
  select id, row_number() over(partition by beekeeper_id order by created_at, id) as rn
  from lek_core.apiaries
)
update lek_core.apiaries a
set sequence_no = s.rn
from s
where a.id = s.id
and a.sequence_no is null;
create unique index if not exists apiaries_beekeeper_sequence_unique on lek_core.apiaries(beekeeper_id, sequence_no);
create or replace function lek_core.set_apiary_sequence()
returns trigger
language plpgsql
as $$
declare nxt integer;
begin
  if new.sequence_no is null then
    select coalesce(max(sequence_no),0)+1 into nxt from lek_core.apiaries where beekeeper_id = new.beekeeper_id;
    new.sequence_no := nxt;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_set_apiary_sequence on lek_core.apiaries;
create trigger trg_set_apiary_sequence
before insert on lek_core.apiaries
for each row
execute function lek_core.set_apiary_sequence();

alter table lek_core.hives add column if not exists beekeeper_id text;
update lek_core.hives h
set beekeeper_id = a.beekeeper_id
from lek_core.apiaries a
where a.apiary_id = h.apiary_id
and h.beekeeper_id is null;
alter table lek_core.hives add column if not exists sequence_no integer;
with s as (
  select h.id, row_number() over(partition by h.beekeeper_id order by h.created_at, h.id) as rn
  from lek_core.hives h
)
update lek_core.hives h
set sequence_no = s.rn
from s
where h.id = s.id
and h.sequence_no is null;
create unique index if not exists hives_beekeeper_sequence_unique on lek_core.hives(beekeeper_id, sequence_no);
create or replace function lek_core.set_hive_sequence()
returns trigger
language plpgsql
as $$
declare bk text;
declare nxt integer;
begin
  if new.beekeeper_id is null then
    select beekeeper_id into bk from lek_core.apiaries where apiary_id = new.apiary_id;
    new.beekeeper_id := bk;
  end if;
  if new.sequence_no is null then
    select coalesce(max(sequence_no),0)+1 into nxt from lek_core.hives where beekeeper_id = new.beekeeper_id;
    new.sequence_no := nxt;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_set_hive_sequence on lek_core.hives;
create trigger trg_set_hive_sequence
before insert on lek_core.hives
for each row
execute function lek_core.set_hive_sequence();

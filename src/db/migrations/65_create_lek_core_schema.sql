-- LEK Core v1.0 – grunnmur (schema, tabeller, enum, ID-regler)

create schema if not exists lek_core;

-- Sekvenser for ID-generering (alle ID-er genereres i databasen)
create sequence if not exists lek_core.beekeeper_id_seq start 100001;
create sequence if not exists lek_core.apiary_seq start 1;
create sequence if not exists lek_core.hive_seq start 1;
create sequence if not exists lek_core.case_id_seq start 1;

-- Autoritativ rot: Beekeepers
create table if not exists lek_core.beekeepers (
    id uuid primary key default gen_random_uuid(),
    beekeeper_id text unique not null default ('BR-' || nextval('lek_core.beekeeper_id_seq')::text),
    full_name text not null,
    email text not null,
    phone_number text not null,
    address text not null,
    postal_code text not null,
    city text not null,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- Begrenser endring av beekeeper_id (kan aldri endres)
create or replace function lek_core.prevent_beekeeper_id_update()
returns trigger
language plpgsql
as $$
begin
    if new.beekeeper_id is distinct from old.beekeeper_id then
        raise exception 'beekeeper_id kan ikke endres';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_prevent_beekeeper_id_update on lek_core.beekeepers;
create trigger trg_prevent_beekeeper_id_update
before update of beekeeper_id on lek_core.beekeepers
for each row
execute function lek_core.prevent_beekeeper_id_update();

-- Ingen delete – kun soft delete via is_active
create or replace function lek_core.prevent_beekeeper_delete()
returns trigger
language plpgsql
as $$
begin
    raise exception 'Delete er ikke tillatt på lek_core.beekeepers. Bruk is_active=false.';
end;
$$;

drop trigger if exists trg_prevent_beekeeper_delete on lek_core.beekeepers;
create trigger trg_prevent_beekeeper_delete
before delete on lek_core.beekeepers
for each row
execute function lek_core.prevent_beekeeper_delete();

-- Bigårder (Apiaries)
create table if not exists lek_core.apiaries (
    id uuid primary key default gen_random_uuid(),
    apiary_id text unique not null,
    beekeeper_id text not null references lek_core.beekeepers(beekeeper_id),
    name text not null,
    created_at timestamptz default now()
);

-- Genererer apiary_id: BG-<beekeeper_id>-NNN
create or replace function lek_core.generate_apiary_id()
returns trigger
language plpgsql
as $$
begin
    if new.apiary_id is null or new.apiary_id = '' then
        new.apiary_id := 'BG-' || new.beekeeper_id || '-' ||
            lpad(nextval('lek_core.apiary_seq')::text, 3, '0');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_generate_apiary_id on lek_core.apiaries;
create trigger trg_generate_apiary_id
before insert on lek_core.apiaries
for each row
execute function lek_core.generate_apiary_id();

-- Kubene (Hives)
create table if not exists lek_core.hives (
    id uuid primary key default gen_random_uuid(),
    hive_id text unique not null,
    apiary_id text not null references lek_core.apiaries(apiary_id),
    created_at timestamptz default now()
);

-- Genererer hive_id: KUBE-<apiary_id>-NNN
create or replace function lek_core.generate_hive_id()
returns trigger
language plpgsql
as $$
begin
    if new.hive_id is null or new.hive_id = '' then
        new.hive_id := 'KUBE-' || new.apiary_id || '-' ||
            lpad(nextval('lek_core.hive_seq')::text, 3, '0');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_generate_hive_id on lek_core.hives;
create trigger trg_generate_hive_id
before insert on lek_core.hives
for each row
execute function lek_core.generate_hive_id();

-- Case Status Enum
do $$
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where t.typname = 'case_status'
          and n.nspname = 'lek_core'
    ) then
        create type lek_core.case_status as enum (
            'OPEN',
            'IN_PROGRESS',
            'PAUSED',
            'RESOLVED',
            'ARCHIVED'
        );
    end if;
end;
$$;

-- Saker (Cases)
create table if not exists lek_core.cases (
    id uuid primary key default gen_random_uuid(),
    case_id text unique not null,
    created_by text not null references lek_core.beekeepers(beekeeper_id),
    assigned_to text references lek_core.beekeepers(beekeeper_id),
    title text not null,
    description text,
    status lek_core.case_status not null default 'OPEN',
    created_at timestamptz default now()
);

-- Genererer case_id: CASE-NNNNNN
create or replace function lek_core.generate_case_id()
returns trigger
language plpgsql
as $$
begin
    if new.case_id is null or new.case_id = '' then
        new.case_id := 'CASE-' || lpad(nextval('lek_core.case_id_seq')::text, 6, '0');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_generate_case_id on lek_core.cases;
create trigger trg_generate_case_id
before insert on lek_core.cases
for each row
execute function lek_core.generate_case_id();


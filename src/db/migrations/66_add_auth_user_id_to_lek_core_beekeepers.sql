alter table lek_core.beekeepers
    add column if not exists auth_user_id uuid unique;


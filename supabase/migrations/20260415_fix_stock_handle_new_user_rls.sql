create or replace function stock_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.stock_profiles (id, full_name, email)
  values (new.id, (new.raw_user_meta_data->>'full_name'), new.email)
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.stock_profiles.full_name),
      updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_stock on auth.users;
create trigger on_auth_user_created_stock
after insert on auth.users
for each row execute procedure stock_handle_new_user();

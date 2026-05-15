do $$
begin
  update public.apiaries a
  set apiary_number = split_part(a.apiary_number, '.', 1)
  where a.apiary_number like '%.%'
    and not exists (
      select 1
      from public.apiaries b
      where b.user_id = a.user_id
        and b.apiary_number = split_part(a.apiary_number, '.', 1)
        and b.id <> a.id
    );
exception
  when undefined_table then null;
end
$$;

do $$
begin
  update public.hives h
  set hive_number = split_part(h.hive_number, '.', 1)
  where h.hive_number like '%.%'
    and not exists (
      select 1
      from public.hives hx
      where hx.apiary_id = h.apiary_id
        and hx.hive_number = split_part(h.hive_number, '.', 1)
        and hx.id <> h.id
    );
exception
  when undefined_table then null;
end
$$;

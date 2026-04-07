drop function if exists stock_admin_hard_reset(integer);

create or replace function stock_admin_hard_reset(new_total_shares integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  holding uuid;
  caller_role text;
  reset_ts timestamptz;
begin
  caller_role := coalesce(nullif(auth.role(), ''), nullif(current_setting('request.jwt.claim.role', true), ''), '');
  if caller_role <> 'service_role' then
    raise exception 'access denied';
  end if;

  if new_total_shares is null or new_total_shares < 0 then
    raise exception 'new_total_shares must be >= 0';
  end if;

  reset_ts := timezone('utc'::text, now());

  select id into holding
  from shareholders
  where user_id is null and lower(navn) = lower('AI Innovate Holding AS')
  limit 1;

  if holding is null then
    insert into shareholders(user_id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering)
    values (null, 'AI Innovate Holding AS', 'holding@aiinnovate.no', 0, 0, reset_ts)
    returning id into holding;
  end if;

  truncate table stock_share_lot_events cascade;
  truncate table stock_share_lots cascade;
  truncate table stock_offerings cascade;
  truncate table stock_listings cascade;
  truncate table transactions cascade;
  truncate table stock_orders cascade;
  truncate table stock_audit_log cascade;

  update shareholders
  set antall_aksjer = 0,
      gjennomsnittspris = 0,
      siste_oppdatering = reset_ts;

  update shareholders
  set antall_aksjer = new_total_shares,
      gjennomsnittspris = 0,
      siste_oppdatering = reset_ts
  where id = holding;

  insert into stock_settings(id, total_shares, holding_shareholder_id, reset_timestamp)
  values (1, new_total_shares, holding, reset_ts)
  on conflict (id) do update
  set total_shares = excluded.total_shares,
      holding_shareholder_id = excluded.holding_shareholder_id,
      reset_timestamp = excluded.reset_timestamp,
      updated_at = reset_ts;
end;
$$;

revoke all on function stock_admin_hard_reset(integer) from public;
revoke all on function stock_admin_hard_reset(integer) from anon;
revoke all on function stock_admin_hard_reset(integer) from authenticated;
grant execute on function stock_admin_hard_reset(integer) to service_role;

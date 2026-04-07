alter table stock_settings
add column if not exists reset_timestamp timestamptz;

create or replace function stock_admin_hard_reset(new_total_shares integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  holding uuid;
  reset_ts timestamptz;
  prev_total_shares integer;
  prev_holding_shares integer;
  actor_id uuid;
  actor_email text;
  actor_ip text;
  headers_json text;
  headers_obj jsonb;
  caller_role text;
  orders_before integer;
  tx_before integer;
  listings_before integer;
  lots_before integer;
  events_before integer;
  offerings_before integer;
begin
  caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  if caller_role <> 'service_role' then
    raise exception 'access denied';
  end if;

  if new_total_shares is null or new_total_shares < 0 then
    raise exception 'new_total_shares must be >= 0';
  end if;

  reset_ts := timezone('utc'::text, now());

  headers_json := current_setting('request.headers', true);
  if headers_json is not null and length(headers_json) > 0 then
    headers_obj := headers_json::jsonb;
    actor_email := nullif(trim(both from coalesce(headers_obj->>'x-reset-actor-email', '')), '');
    actor_ip := nullif(trim(both from coalesce(headers_obj->>'x-forwarded-for', headers_obj->>'x-real-ip', headers_obj->>'x-reset-ip', '')), '');
    if actor_ip is not null then
      actor_ip := split_part(actor_ip, ',', 1);
    end if;
    begin
      actor_id := nullif(trim(both from coalesce(headers_obj->>'x-reset-actor-id', '')), '')::uuid;
    exception when others then
      actor_id := null;
    end;
  end if;

  select total_shares into prev_total_shares from stock_settings where id = 1;
  prev_total_shares := coalesce(prev_total_shares, 0);

  select count(*) into orders_before from stock_orders;
  select count(*) into tx_before from transactions;
  select count(*) into listings_before from stock_listings;
  select count(*) into lots_before from stock_share_lots;
  select count(*) into events_before from stock_share_lot_events;
  select count(*) into offerings_before from stock_offerings;

  select id into holding
  from shareholders
  where user_id is null and lower(navn) = lower('AI Innovate Holding AS')
  limit 1;

  if holding is null then
    insert into shareholders(user_id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering)
    values (null, 'AI Innovate Holding AS', 'holding@aiinnovate.no', 0, 0, reset_ts)
    returning id into holding;
  end if;

  select antall_aksjer into prev_holding_shares from shareholders where id = holding;
  prev_holding_shares := coalesce(prev_holding_shares, 0);

  truncate table stock_share_lot_events cascade;
  truncate table stock_share_lots cascade;
  truncate table stock_offerings cascade;
  truncate table stock_listings cascade;
  truncate table transactions cascade;
  truncate table stock_orders cascade;

  update shareholders
  set antall_aksjer = 0,
      gjennomsnittspris = 0,
      siste_oppdatering = reset_ts;

  update shareholders
  set antall_aksjer = new_total_shares,
      gjennomsnittspris = 0,
      siste_oppdatering = reset_ts
  where id = holding;

  delete from shareholders where id <> holding;

  insert into stock_settings(id, total_shares, holding_shareholder_id, reset_timestamp)
  values (1, new_total_shares, holding, reset_ts)
  on conflict (id) do update
  set total_shares = excluded.total_shares,
      holding_shareholder_id = excluded.holding_shareholder_id,
      reset_timestamp = excluded.reset_timestamp,
      updated_at = reset_ts;

  if new_total_shares > 0 then
    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no)
    values (holding, 'A', 1, new_total_shares);
  end if;

  perform stock_log(
    actor_id,
    'hard_reset',
    actor_ip,
    jsonb_build_object(
      'actor_email', actor_email,
      'prev_total_shares', prev_total_shares,
      'prev_holding_shares', prev_holding_shares,
      'new_total_shares', new_total_shares,
      'orders_deleted', orders_before,
      'transactions_deleted', tx_before,
      'listings_deleted', listings_before,
      'share_lots_deleted', lots_before,
      'share_lot_events_deleted', events_before,
      'offerings_deleted', offerings_before,
      'reset_timestamp', reset_ts
    )
  );
end;
$$;

revoke all on function stock_admin_hard_reset(integer) from public;
revoke all on function stock_admin_hard_reset(integer) from anon;
revoke all on function stock_admin_hard_reset(integer) from authenticated;
grant execute on function stock_admin_hard_reset(integer) to service_role;

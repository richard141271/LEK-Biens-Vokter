create or replace function stock_admin_hard_reset(total_shares_input integer)
returns void as $$
declare
  holding uuid;
begin
  if total_shares_input is null or total_shares_input < 0 then
    raise exception 'total_shares must be >= 0';
  end if;

  select id into holding
  from shareholders
  where user_id is null and lower(navn) = lower('AI Innovate Holding AS')
  limit 1;

  if holding is null then
    insert into shareholders(user_id, navn, email, antall_aksjer, gjennomsnittspris)
    values (null, 'AI Innovate Holding AS', 'holding@aiinnovate.no', total_shares_input, 0)
    returning id into holding;
  end if;

  delete from stock_share_lot_events;
  delete from stock_share_lots;
  delete from stock_listings;
  delete from stock_orders;
  delete from transactions;
  delete from stock_audit_log;
  delete from stock_offerings;

  update shareholders
  set antall_aksjer = 0,
      gjennomsnittspris = 0,
      siste_oppdatering = timezone('utc'::text, now())
  where id <> holding;

  update shareholders
  set antall_aksjer = total_shares_input,
      gjennomsnittspris = 0,
      siste_oppdatering = timezone('utc'::text, now())
  where id = holding;

  insert into stock_settings(id, total_shares, holding_shareholder_id)
  values (1, total_shares_input, holding)
  on conflict (id) do update
  set total_shares = excluded.total_shares,
      holding_shareholder_id = excluded.holding_shareholder_id,
      updated_at = timezone('utc'::text, now());
end;
$$ language plpgsql security definer;


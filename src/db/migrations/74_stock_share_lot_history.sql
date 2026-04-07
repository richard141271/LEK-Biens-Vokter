create table if not exists stock_share_lot_events (
  id uuid default gen_random_uuid() primary key,
  from_shareholder_id uuid references shareholders(id) on delete set null,
  to_shareholder_id uuid references shareholders(id) on delete set null,
  share_class text not null default 'A',
  start_no int not null check (start_no > 0),
  end_no int not null check (end_no >= start_no),
  order_id uuid references stock_orders(id) on delete set null,
  tx_id uuid references transactions(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists stock_share_lot_events_order_idx on stock_share_lot_events(order_id);
create index if not exists stock_share_lot_events_tx_idx on stock_share_lot_events(tx_id);
create index if not exists stock_share_lot_events_from_idx on stock_share_lot_events(from_shareholder_id, share_class, start_no);
create index if not exists stock_share_lot_events_to_idx on stock_share_lot_events(to_shareholder_id, share_class, start_no);

alter table if exists stock_share_lot_events enable row level security;

create or replace function stock_transfer_share_lots_v2(
  from_shareholder_id uuid,
  to_user_id uuid,
  share_count_input int,
  share_class_input text,
  order_id_input uuid,
  tx_id_input uuid,
  log_events boolean
)
returns void as $$
declare
  remaining int;
  take int;
  lot record;
  lot_size int;
  transfer_start int;
  transfer_end int;
  buyer_sh uuid;
begin
  if share_count_input is null or share_count_input <= 0 then
    raise exception 'invalid share count';
  end if;
  if from_shareholder_id is null then
    raise exception 'missing from shareholder';
  end if;

  buyer_sh := stock_ensure_shareholder_for_user(to_user_id);
  remaining := share_count_input;

  while remaining > 0 loop
    select id, start_no, end_no
    into lot
    from stock_share_lots
    where shareholder_id = from_shareholder_id and share_class = share_class_input
    order by start_no asc
    limit 1
    for update;

    if lot.id is null then
      raise exception 'not enough share lots';
    end if;

    lot_size := lot.end_no - lot.start_no + 1;
    take := least(remaining, lot_size);
    transfer_start := lot.start_no;
    transfer_end := lot.start_no + take - 1;

    if take = lot_size then
      delete from stock_share_lots where id = lot.id;
    else
      update stock_share_lots set start_no = lot.start_no + take where id = lot.id;
    end if;

    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no, source_order_id, source_tx_id)
    values (buyer_sh, share_class_input, transfer_start, transfer_end, order_id_input, tx_id_input);

    if log_events then
      insert into stock_share_lot_events(from_shareholder_id, to_shareholder_id, share_class, start_no, end_no, order_id, tx_id)
      values (from_shareholder_id, buyer_sh, share_class_input, transfer_start, transfer_end, order_id_input, tx_id_input);
    end if;

    remaining := remaining - take;
  end loop;

  perform stock_merge_adjacent_lots(buyer_sh, share_class_input);
end;
$$ language plpgsql security definer;

create or replace function stock_transfer_share_lots(
  from_shareholder_id uuid,
  to_user_id uuid,
  share_count_input int,
  share_class_input text,
  order_id_input uuid,
  tx_id_input uuid
)
returns void as $$
begin
  perform stock_transfer_share_lots_v2(from_shareholder_id, to_user_id, share_count_input, share_class_input, order_id_input, tx_id_input, true);
end;
$$ language plpgsql security definer;

create or replace function stock_rebuild_share_lots()
returns void as $$
declare
  holding_id uuid;
  total int;
  t record;
  from_sh uuid;
begin
  truncate table stock_share_lot_events;
  truncate table stock_share_lots;

  select holding_shareholder_id, total_shares into holding_id, total
  from stock_settings where id = 1;

  if holding_id is null then
    raise exception 'holding not configured';
  end if;

  if total is null or total <= 0 then
    total := 0;
  end if;

  if total > 0 then
    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no)
    values (holding_id, 'A', 1, total);
  end if;

  for t in
    select id, type, buyer, seller, antall, dato, order_id
    from transactions
    where type in ('emisjon', 'videresalg')
    order by dato asc, id asc
  loop
    if t.type = 'emisjon' then
      from_sh := holding_id;
    else
      from_sh := stock_ensure_shareholder_for_user(t.seller);
    end if;

    perform stock_transfer_share_lots_v2(from_sh, t.buyer, t.antall, 'A', t.order_id, t.id, false);
  end loop;
end;
$$ language plpgsql security definer;

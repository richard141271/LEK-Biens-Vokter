do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'stock_payment_method' and e.enumlabel = 'vipps'
  ) then
    alter type stock_payment_method add value 'vipps';
  end if;
end
$$;

alter table if exists shareholders
  add column if not exists payout_bank_account text,
  add column if not exists payout_vipps text,
  add column if not exists payout_usdt_trc20 text;


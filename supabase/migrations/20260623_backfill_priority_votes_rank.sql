with ranked as (
  select
    id,
    least(row_number() over (partition by user_id order by created_at asc, id asc), 3) as rn
  from public.feedback_reports
  where type = 'vote'
    and (
      (device_info ? 'priorityFeature')
      or (title like 'Prioritering:%')
    )
)
update public.feedback_reports fr
set
  priority = case ranked.rn
    when 1 then 'KRITISK'
    when 2 then 'NORMAL'
    else 'LAV'
  end,
  device_info = jsonb_set(coalesce(fr.device_info, '{}'::jsonb), '{priorityRank}', to_jsonb(ranked.rn), true)
from ranked
where fr.id = ranked.id;

alter table public.feedback_reports
  add column if not exists category text null;

create index if not exists feedback_reports_category_idx
  on public.feedback_reports (category);

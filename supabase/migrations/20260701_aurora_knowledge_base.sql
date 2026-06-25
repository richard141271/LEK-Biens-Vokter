create table if not exists public.aurora_knowledge (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text,
  full_content text,
  possible_causes jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  priority text not null default 'medium',
  difficulty text not null default 'beginner',
  season text not null default 'all',
  tags jsonb not null default '[]'::jsonb,
  follow_up_days integer,
  approved boolean not null default false,
  approved_by text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_reviewed timestamptz default now(),
  constraint aurora_knowledge_priority_check check (priority in ('low', 'medium', 'high')),
  constraint aurora_knowledge_difficulty_check check (difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint aurora_knowledge_season_check check (season in ('spring', 'summer', 'autumn', 'winter', 'all'))
);

create index if not exists aurora_knowledge_slug_idx on public.aurora_knowledge (slug);
create index if not exists aurora_knowledge_tags_gin_idx on public.aurora_knowledge using gin (tags);
create index if not exists aurora_knowledge_approved_idx on public.aurora_knowledge (approved, updated_at desc);

alter table public.aurora_knowledge enable row level security;

create policy "aurora_knowledge_select_authenticated"
on public.aurora_knowledge
for select
using (auth.uid() is not null);

create or replace function public.set_aurora_knowledge_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aurora_knowledge_updated_at_trigger on public.aurora_knowledge;

create trigger aurora_knowledge_updated_at_trigger
before update on public.aurora_knowledge
for each row
execute function public.set_aurora_knowledge_updated_at();

alter table public.aurora_suggestions
  add column if not exists knowledge_slug text,
  add column if not exists knowledge_version integer;

insert into public.aurora_knowledge (
  slug,
  title,
  short_description,
  full_content,
  possible_causes,
  recommended_actions,
  priority,
  difficulty,
  season,
  tags,
  follow_up_days,
  approved,
  approved_by,
  version,
  last_reviewed
)
values
  (
    'deformerte_vinger',
    'Deformerte vinger hos bier',
    'Deformerte vinger kan være et tegn på Deformed Wing Virus (DWV) eller høyt varroatrykk.',
    'Deformerte vinger hos enkelte bier bør vurderes i sammenheng med varroabelastning, generell kubestyrke og andre sykdomstegn.',
    '["Deformed Wing Virus (DWV)", "Høyt varroatrykk", "Utviklingsforstyrrelser"]'::jsonb,
    '["Kontroller varroanivå", "Ta bilder ved neste inspeksjon", "Observer om flere bier viser samme symptomer", "Følg opp innen 7 dager"]'::jsonb,
    'medium',
    'beginner',
    'all',
    '["varroa", "dwv", "sykdom"]'::jsonb,
    7,
    true,
    'AKB bootstrap',
    1,
    now()
  ),
  (
    'lav_matstatus',
    'Lite fôr / behov for støttefôring',
    'Lite fôr bør følges opp raskt for å redusere risiko for svekkelse eller sult.',
    'Lav matstatus må vurderes i lys av årstid, vær, trekkforhold og om kuben nylig har fått fôr.',
    '["Lav tilgang på trekk", "Høyt forbruk i sterk kube", "Sen oppfølging etter forrige inspeksjon"]'::jsonb,
    '["Ta med fôr ved neste besøk", "Bekreft faktisk matstatus i kuben", "Vurder støttefôring hvis nivået fortsatt er lavt", "Planlegg ny kontroll innen få dager"]'::jsonb,
    'high',
    'beginner',
    'all',
    '["fôr", "støttefôring", "oppfølging"]'::jsonb,
    3,
    true,
    'AKB bootstrap',
    1,
    now()
  ),
  (
    'varroa_mistanke',
    'Mistanke om varroa',
    'Mistanke om varroa bør følges opp med test, middfallsvurdering eller ny kontroll.',
    'Varroa bør vurderes i sammenheng med deformerte vinger, kubeutvikling, sesong og tidligere behandling.',
    '["Økt middtrykk", "Manglende eller svak effekt av tidligere behandling", "Smittepress fra nærliggende kuber"]'::jsonb,
    '["Gjennomfør varroatest", "Kontroller middfall eller andre symptomer", "Dokumenter funn med bilder ved behov", "Følg opp innen 3 dager"]'::jsonb,
    'high',
    'intermediate',
    'all',
    '["varroa", "midd", "sykdom"]'::jsonb,
    3,
    true,
    'AKB bootstrap',
    1,
    now()
  ),
  (
    'sykdomstegn',
    'Sykdomstegn i kube',
    'Sykdomstegn må avklares raskt slik at smittefare og alvorlighetsgrad blir vurdert tidlig.',
    'Sykdomstegn kan gjelde yngel, voksne bier eller avføring og må ses i sammenheng med smittevern og dokumentasjon.',
    '["Yngelsykdom", "Virus eller parasittbelastning", "Tarmproblem eller annen svekkelse"]'::jsonb,
    '["Ta bilder og noter hvilke bier eller tavler som er berørt", "Unngå å flytte materiell mellom kuber før funnet er vurdert", "Vurder behov for smitteverntiltak", "Følg opp senest neste dag ved tydelige symptomer"]'::jsonb,
    'high',
    'intermediate',
    'all',
    '["sykdom", "smittevern", "inspeksjon"]'::jsonb,
    1,
    true,
    'AKB bootstrap',
    1,
    now()
  ),
  (
    'dronningsituasjon',
    'Vurder dronningsituasjonen',
    'Manglende egg eller usikker dronningsituasjon bør følges opp før større tiltak settes inn.',
    'Dronningsituasjonen vurderes best ved å se etter ferske egg, ung larve, dronningceller og ro i kuben.',
    '["Dronningsvikt", "Nylig dronningtap", "Pågående stille omskifting"]'::jsonb,
    '["Kontroller om det finnes ferske egg eller ung larve", "Se etter dronningceller og generell ro i kuben", "Unngå store inngrep før situasjonen er bekreftet", "Følg opp innen 3 til 7 dager"]'::jsonb,
    'medium',
    'intermediate',
    'all',
    '["dronning", "egg", "yngel"]'::jsonb,
    5,
    true,
    'AKB bootstrap',
    1,
    now()
  ),
  (
    'dronningbytte',
    'Planlegging av dronningbytte',
    'Dronningbytte bør planlegges når behovet er bekreftet og oppfølging kan gjennomføres trygt.',
    'Dronningbytte må sees i sammenheng med kubeutvikling, årstid og om det finnes fersk egglegging.',
    '["Vedvarende svak utvikling", "Aggressivt gemytt", "Ustabil eller svak egglegging"]'::jsonb,
    '["Bekreft først behovet for dronningbytte", "Se etter ferske egg og dronningceller før tiltak", "Planlegg tidspunkt hvor oppfølging er mulig", "Følg opp innen 7 dager"]'::jsonb,
    'medium',
    'intermediate',
    'summer',
    '["dronning", "dronningbytte", "oppfølging"]'::jsonb,
    7,
    true,
    'AKB bootstrap',
    1,
    now()
  ),
  (
    'svermetrang',
    'Mulig svermetrang',
    'Tegn til svermetrang bør vurderes raskt i aktiv sesong for å unngå tapt kubeutvikling.',
    'Svermetrang vurderes ved å se etter dronningceller, plassmangel, styrke og ferske egg.',
    '["Trang kube", "Sterk utvikling i aktiv sesong", "Manglende plass eller rammer"]'::jsonb,
    '["Kontroller dronningceller og plassforhold", "Vurder ekstra plass eller andre tiltak mot svermetrang", "Bekreft egglegging ved neste inspeksjon", "Følg opp innen 3 dager i aktiv sesong"]'::jsonb,
    'medium',
    'beginner',
    'spring',
    '["sverming", "dronningceller", "sesong"]'::jsonb,
    3,
    true,
    'AKB bootstrap',
    1,
    now()
  )
on conflict (slug) do update
set
  title = excluded.title,
  short_description = excluded.short_description,
  full_content = excluded.full_content,
  possible_causes = excluded.possible_causes,
  recommended_actions = excluded.recommended_actions,
  priority = excluded.priority,
  difficulty = excluded.difficulty,
  season = excluded.season,
  tags = excluded.tags,
  follow_up_days = excluded.follow_up_days,
  approved = excluded.approved,
  approved_by = excluded.approved_by,
  version = excluded.version,
  updated_at = now(),
  last_reviewed = excluded.last_reviewed;


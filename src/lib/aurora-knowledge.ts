export type AuroraKnowledgePriority = 'low' | 'medium' | 'high';
export type AuroraKnowledgeDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type AuroraKnowledgeSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

export type AuroraKnowledgeItem = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  full_content: string | null;
  possible_causes: string[];
  recommended_actions: string[];
  priority: AuroraKnowledgePriority | null;
  difficulty: AuroraKnowledgeDifficulty | null;
  season: AuroraKnowledgeSeason | null;
  tags: string[];
  follow_up_days: number | null;
  approved: boolean;
  approved_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  last_reviewed: string | null;
};

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || '').trim()).filter(Boolean)
    : [];
}

export function normalizeAuroraKnowledgeItem(row: any): AuroraKnowledgeItem {
  return {
    id: String(row?.id || ''),
    slug: String(row?.slug || '').trim(),
    title: String(row?.title || '').trim(),
    short_description: row?.short_description ? String(row.short_description) : null,
    full_content: row?.full_content ? String(row.full_content) : null,
    possible_causes: toStringArray(row?.possible_causes),
    recommended_actions: toStringArray(row?.recommended_actions),
    priority: row?.priority ? String(row.priority).toLowerCase() as AuroraKnowledgePriority : null,
    difficulty: row?.difficulty ? String(row.difficulty).toLowerCase() as AuroraKnowledgeDifficulty : null,
    season: row?.season ? String(row.season).toLowerCase() as AuroraKnowledgeSeason : null,
    tags: toStringArray(row?.tags),
    follow_up_days: typeof row?.follow_up_days === 'number' ? row.follow_up_days : row?.follow_up_days ? Number(row.follow_up_days) : null,
    approved: Boolean(row?.approved),
    approved_by: row?.approved_by ? String(row.approved_by) : null,
    version: typeof row?.version === 'number' ? row.version : Number(row?.version || 1),
    created_at: String(row?.created_at || ''),
    updated_at: String(row?.updated_at || ''),
    last_reviewed: row?.last_reviewed ? String(row.last_reviewed) : null,
  };
}

export function buildAuroraGuidanceFromKnowledge(item: AuroraKnowledgeItem | null | undefined) {
  if (!item) return [];
  const lines: string[] = [];
  const short = String(item.short_description || '').trim();
  if (short) lines.push(short);
  if (item.possible_causes.length > 0) {
    lines.push(`Mulige årsaker: ${item.possible_causes.join(', ')}.`);
  }
  if (item.recommended_actions.length > 0) {
    for (const action of item.recommended_actions) {
      lines.push(action);
    }
  }
  if (item.follow_up_days && item.follow_up_days > 0) {
    lines.push(`Følg opp innen ${item.follow_up_days} dager.`);
  }
  return lines;
}

export function buildAuroraGuidanceFromKnowledgeSlugs(
  slugs: string[],
  knowledgeMap?: Map<string, AuroraKnowledgeItem>
) {
  const uniq = Array.from(new Set((slugs || []).map((slug) => String(slug || '').trim()).filter(Boolean)));
  const lines: string[] = [];

  for (const slug of uniq) {
    const item = knowledgeMap?.get(slug);
    for (const line of buildAuroraGuidanceFromKnowledge(item)) {
      if (!lines.includes(line)) lines.push(line);
    }
  }

  return lines;
}

export async function fetchAuroraKnowledgeMap(
  supabase: any,
  slugs: string[]
) {
  const uniq = Array.from(new Set((slugs || []).map((slug) => String(slug || '').trim()).filter(Boolean)));
  if (uniq.length === 0) return new Map<string, AuroraKnowledgeItem>();

  const { data, error } = await supabase
    .from('aurora_knowledge')
    .select(
      'id, slug, title, short_description, full_content, possible_causes, recommended_actions, priority, difficulty, season, tags, follow_up_days, approved, approved_by, version, created_at, updated_at, last_reviewed'
    )
    .in('slug', uniq)
    .eq('approved', true);

  if (error || !Array.isArray(data)) return new Map<string, AuroraKnowledgeItem>();

  return new Map(
    data
      .map((row: any) => normalizeAuroraKnowledgeItem(row))
      .filter((item) => item.slug)
      .map((item) => [item.slug, item] as const)
  );
}

export async function fetchAuroraKnowledgeList(
  supabase: any,
  slugs: string[]
) {
  const map = await fetchAuroraKnowledgeMap(supabase, slugs);
  return (slugs || [])
    .map((slug) => map.get(String(slug || '').trim()))
    .filter((item): item is AuroraKnowledgeItem => Boolean(item));
}

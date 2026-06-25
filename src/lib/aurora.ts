import { AuroraKnowledgeItem, buildAuroraGuidanceFromKnowledge } from '@/lib/aurora-knowledge';

export type AuroraDueKind = 'NEXT_VISIT' | 'TOMORROW' | 'DAYS_3' | 'NEXT_WEEK' | 'PICK_DATE';

export type AuroraSeverity = 'info' | 'warning' | 'urgent';

export type AuroraSuggestion = {
  key: string;
  title: string;
  rationale: string;
  severity: AuroraSeverity;
  dueKind: AuroraDueKind;
  dueDate: string;
  guidance: string[];
  knowledgeSlug?: string | null;
  knowledgeVersion?: number | null;
};

export type AuroraValidation = {
  key: string;
  severity: 'info' | 'warning';
  title: string;
  message: string;
};

type BroodAmount = 'lite' | 'normal' | 'mye';

type InspectionBiologyInput = {
  queen_seen?: boolean | null;
  eggs_seen?: boolean | null;
  brood_condition?: string | null;
  honey_stores?: string | null;
  status?: string | null;
  performed_actions?: any;
  notes?: string | null;
};

export function toDateOnly(date: Date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeDue(kind: AuroraDueKind, picked: string) {
  if (kind === 'NEXT_VISIT') return { due_kind: kind, due_date: null as string | null };
  if (kind === 'PICK_DATE') return { due_kind: kind, due_date: picked || toDateOnly(new Date()) };

  const base = new Date();
  if (kind === 'TOMORROW') base.setDate(base.getDate() + 1);
  if (kind === 'DAYS_3') base.setDate(base.getDate() + 3);
  if (kind === 'NEXT_WEEK') base.setDate(base.getDate() + 7);
  return { due_kind: kind, due_date: toDateOnly(base) };
}

export function extractDateISOFromText(text: string) {
  const s = String(text || '');
  const iso = s.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) return toDateOnly(date);
  }

  const dot = s.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);
  if (dot) {
    const d = Number(dot[1]);
    const m = Number(dot[2]);
    const y = Number(dot[3]);
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) return toDateOnly(date);
  }

  const dayMonth = s.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  if (dayMonth) {
    const d = Number(dayMonth[1]);
    const m = Number(dayMonth[2]);
    const y = new Date().getFullYear();
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) return toDateOnly(date);
  }

  return null;
}

export function smartDefaultDueMetaForSuggestion(input: {
  noteText: string;
  suggestionTitle: string;
  nextPlannedDateISO?: string | null;
  earliestOpenTaskDueDateISO?: string | null;
  fallbackDueKind?: AuroraDueKind;
  fallbackDueDate?: string;
}) {
  const note = String(input.noteText || '');
  const title = String(input.suggestionTitle || '');
  const combined = `${title}\n${note}`.toLowerCase();

  const extracted = extractDateISOFromText(combined);
  if (extracted) return { dueKind: 'PICK_DATE' as const, dueDate: extracted };

  if (combined.includes('i morgen')) {
    return { dueKind: 'TOMORROW' as const, dueDate: toDateOnly(new Date()) };
  }
  if (combined.match(/\bom\s*3\s*dager\b/)) {
    return { dueKind: 'DAYS_3' as const, dueDate: toDateOnly(new Date()) };
  }
  if (combined.includes('neste uke')) {
    return { dueKind: 'NEXT_WEEK' as const, dueDate: toDateOnly(new Date()) };
  }
  if (combined.includes('neste besøk')) {
    return { dueKind: 'NEXT_VISIT' as const, dueDate: toDateOnly(new Date()) };
  }

  if (input.nextPlannedDateISO) return { dueKind: 'PICK_DATE' as const, dueDate: input.nextPlannedDateISO };
  if (input.earliestOpenTaskDueDateISO) return { dueKind: 'PICK_DATE' as const, dueDate: input.earliestOpenTaskDueDateISO };

  if (input.fallbackDueKind && input.fallbackDueKind !== 'NEXT_VISIT') {
    return { dueKind: input.fallbackDueKind, dueDate: input.fallbackDueDate || toDateOnly(new Date()) };
  }

  return { dueKind: 'NEXT_VISIT' as const, dueDate: input.fallbackDueDate || toDateOnly(new Date()) };
}

export function sanitizeAuroraText(raw: string) {
  return String(raw || '')
    .replace(/\[\[LEK_VOICE_LOG:[\s\S]*?\]\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortQuote(text: string, maxLen: number) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function normalizeHoneyStores(value: unknown) {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'lite' || s === 'middels' || s === 'mye') return s as 'lite' | 'middels' | 'mye';
  return null;
}

function normalizeBroodAmount(value: unknown): BroodAmount {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'lite' || s === 'mye') return s;
  return 'normal';
}

function parseBroodCondition(raw: string | null | undefined) {
  const parts = String(raw || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const map = new Map<string, string>();
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    map.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
  }
  return {
    egg: normalizeBroodAmount(map.get('egg')),
    larver: normalizeBroodAmount(map.get('larver')),
    yngel: normalizeBroodAmount(map.get('yngel')),
    droner: normalizeBroodAmount(map.get('droner')),
    frames: String(map.get('frames') || '').trim(),
  };
}

function hasPerformedAction(performedActions: any, id: string) {
  const list = Array.isArray(performedActions) ? performedActions : [];
  return list.some((a) => String(a?.id || '').toUpperCase() === id.toUpperCase());
}

function upsertSuggestion(list: AuroraSuggestion[], next: AuroraSuggestion) {
  const idx = list.findIndex((s) => s.key === next.key);
  if (idx === -1) {
    list.push(next);
    return;
  }
  const severityOrder: Record<AuroraSeverity, number> = { urgent: 3, warning: 2, info: 1 };
  const current = list[idx];
  list[idx] =
    severityOrder[next.severity] >= severityOrder[current.severity]
      ? { ...current, ...next }
      : { ...next, ...current };
}

function getKnowledgeRationale(item: AuroraKnowledgeItem | null | undefined, prefix: string, fallback: string) {
  const short = String(item?.short_description || '').trim();
  if (short) return `${prefix}: ${short}`;
  return fallback;
}

function buildSuggestionFromKnowledge(input: {
  key: string;
  title: string;
  severity: AuroraSeverity;
  dueKind: AuroraDueKind;
  dueDate: string;
  knowledgeSlug: string;
  knowledgeMap?: Map<string, AuroraKnowledgeItem>;
  rationalePrefix: string;
  fallbackRationale: string;
}) {
  const item = input.knowledgeMap?.get(input.knowledgeSlug) || null;
  return {
    key: input.key,
    title: input.title,
    severity: input.severity,
    dueKind: input.dueKind,
    dueDate: input.dueDate,
    rationale: getKnowledgeRationale(item, input.rationalePrefix, input.fallbackRationale),
    guidance: buildAuroraGuidanceFromKnowledge(item),
    knowledgeSlug: item?.slug || input.knowledgeSlug,
    knowledgeVersion: item?.version || null,
  } satisfies AuroraSuggestion;
}

function getFeedFollowupMetaFromText(raw: string) {
  const text = sanitizeAuroraText(raw).toLowerCase();
  const mentionsFeed =
    /\b(fore|fôre|fora|fôra|fôr|foring|fôring|støttefôring|støtteforing|gi fôr|gi for|nødfôr|nodfor|sukkerlake)\b/.test(text);
  if (!mentionsFeed) return null;

  if (/\b(i morgen|snarest|så fort som mulig|sa fort som mulig|umiddelbart)\b/.test(text)) {
    return { severity: 'urgent' as const, dueKind: 'TOMORROW' as const };
  }
  if (/\b(nærmeste dagene|de neste dagene|innen få dager|innen fa dager|snart)\b/.test(text)) {
    return { severity: 'warning' as const, dueKind: 'DAYS_3' as const };
  }
  if (/\b(neste uke)\b/.test(text)) {
    return { severity: 'info' as const, dueKind: 'NEXT_WEEK' as const };
  }

  return { severity: 'warning' as const, dueKind: 'DAYS_3' as const };
}

function isFeedRelatedTitle(title: string) {
  const normalized = String(title || '').toLowerCase();
  return /\b(fore|fôre|fora|fôra|fôr|for\b|foring|fôring|støttefôring|støtteforing|nødfôr|nodfor|sukkerlake)\b/.test(normalized);
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function isFillerSentence(sentence: string) {
  const s = sanitizeAuroraText(sentence).toLowerCase();
  if (!s) return true;
  return matchesAny(s, [
    /\bser generelt bra ut\b/,
    /\bser bra ut\b/,
    /\bgenerelt bra\b/,
    /\blitt usikker\b/,
    /\busikker på småting\b/,
    /\bsmåting\b/,
    /\balt virker greit\b/,
    /\bingen spesielle funn\b/,
  ]);
}

function isFollowupSentence(sentence: string) {
  const s = sanitizeAuroraText(sentence).toLowerCase();
  return matchesAny(s, [
    /\bmå\b/,
    /\bmå\b/,
    /\bbør\b/,
    /\bburde\b/,
    /\bfølg(?:e)? opp\b/,
    /\bkontroller(?:e)?\b/,
    /\bsjekk(?:e)?\b/,
    /\bfinne ut\b/,
    /\bta bilder\b/,
    /\bdokumenter\b/,
  ]);
}

type NoteThemeGroup = {
  key: string;
  sentences: string[];
};

function splitNoteIntoSentences(note: string) {
  return sanitizeAuroraText(note)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function detectThemesForSentence(sentence: string) {
  const s = sanitizeAuroraText(sentence).toLowerCase();
  const keys: string[] = [];
  if (matchesAny(s, [/\bdeformerte? vinger\b/, /\bkrøllete vinger\b/, /\bmisdannede vinger\b/, /\bdwv\b/])) keys.push('DWV');
  if (matchesAny(s, [/\bvarroa\b/, /\bmiddfall\b/, /\bmidd\b/, /\bmiddtrykk\b/])) keys.push('VARROA');
  if (matchesAny(s, [/\bfore\b/, /\bfôre\b/, /\bfora\b/, /\bfôra\b/, /\bfôr\b/, /\bstøttefôring\b/, /\bnødfôr\b/, /\bsukkerlake\b/])) keys.push('FEED');
  if (matchesAny(s, [/\bdronning\b/, /\bdronningløs\b/, /\bingen egg\b/, /\bikke sett egg\b/, /\bikke sett dronning\b/])) keys.push('QUEEN');
  if (matchesAny(s, [/\bsykdom\b/, /\bkalkyngel\b/, /\bdiar[eé]\b/, /\bsvart yngel\b/, /\bfoulbrood\b/])) keys.push('DISEASE');
  if (matchesAny(s, [/\bsverm\b/, /\bsverming\b/, /\bdronningceller\b/])) keys.push('SWARM');
  return keys;
}

function analyzeNoteThemes(note: string) {
  const groups = new Map<string, NoteThemeGroup>();
  const sentences = splitNoteIntoSentences(note);
  let lastThemeKey: string | null = null;

  for (const sentence of sentences) {
    if (isFillerSentence(sentence)) continue;
    const directThemes = detectThemesForSentence(sentence);
    if (directThemes.length > 0) {
      for (const key of directThemes) {
        const existing = groups.get(key) || { key, sentences: [] };
        existing.sentences.push(sentence);
        groups.set(key, existing);
      }
      lastThemeKey = directThemes[0];
      continue;
    }

    if (lastThemeKey && isFollowupSentence(sentence)) {
      const existing = groups.get(lastThemeKey);
      if (existing) existing.sentences.push(sentence);
      continue;
    }

    if (isFollowupSentence(sentence)) {
      const existing = groups.get('ACTIONABLE') || { key: 'ACTIONABLE', sentences: [] };
      existing.sentences.push(sentence);
      groups.set('ACTIONABLE', existing);
    }
  }

  return Array.from(groups.values());
}

function buildThemeSuggestion(input: {
  theme: NoteThemeGroup;
  noteId: string;
  noteText: string;
  hiveLabel: string;
  sourceLabel: string;
  knowledgeMap?: Map<string, AuroraKnowledgeItem>;
  nextPlannedDateISO?: string | null;
  earliestOpenTaskDueDateISO?: string | null;
}): AuroraSuggestion | null {
  const quote = shortQuote(input.theme.sentences.join(' '), 160) || shortQuote(input.noteText, 160);
  switch (input.theme.key) {
    case 'FEED': {
      const due = smartDefaultDueMetaForSuggestion({
        noteText: input.noteText,
        suggestionTitle: `Støttefôring: ${input.hiveLabel}`,
        nextPlannedDateISO: input.nextPlannedDateISO || null,
        earliestOpenTaskDueDateISO: input.earliestOpenTaskDueDateISO || null,
        fallbackDueKind: 'DAYS_3',
        fallbackDueDate: toDateOnly(new Date()),
      });
      return buildSuggestionFromKnowledge({
        key: `NOTE:${input.noteId}:FEED`,
        title: `Lite fôr / behov for støttefôring: ${input.hiveLabel}`,
        severity: due.dueKind === 'TOMORROW' ? 'urgent' : 'warning',
        dueKind: due.dueKind,
        dueDate: due.dueDate,
        knowledgeSlug: 'lav_matstatus',
        knowledgeMap: input.knowledgeMap,
        rationalePrefix: `Basert på ${input.sourceLabel}`,
        fallbackRationale: `Basert på ${input.sourceLabel}: «${quote}»`,
      });
    }
    case 'DWV':
      return buildSuggestionFromKnowledge({
        key: `NOTE:${input.noteId}:DWV`,
        title: `Deformerte vinger hos bier: ${input.hiveLabel}`,
        severity: 'warning',
        dueKind: 'DAYS_3',
        dueDate: toDateOnly(new Date()),
        knowledgeSlug: 'deformerte_vinger',
        knowledgeMap: input.knowledgeMap,
        rationalePrefix: `Basert på ${input.sourceLabel}`,
        fallbackRationale: `Basert på ${input.sourceLabel}: «${quote}»`,
      });
    case 'VARROA':
      return buildSuggestionFromKnowledge({
        key: `NOTE:${input.noteId}:VARROA`,
        title: `Mistanke om varroa: ${input.hiveLabel}`,
        severity: 'warning',
        dueKind: 'DAYS_3',
        dueDate: toDateOnly(new Date()),
        knowledgeSlug: 'varroa_mistanke',
        knowledgeMap: input.knowledgeMap,
        rationalePrefix: `Basert på ${input.sourceLabel}`,
        fallbackRationale: `Basert på ${input.sourceLabel}: «${quote}»`,
      });
    case 'QUEEN':
      return buildSuggestionFromKnowledge({
        key: `NOTE:${input.noteId}:QUEEN`,
        title: `Vurder dronningsituasjonen: ${input.hiveLabel}`,
        severity: 'warning',
        dueKind: 'DAYS_3',
        dueDate: toDateOnly(new Date()),
        knowledgeSlug: 'dronningsituasjon',
        knowledgeMap: input.knowledgeMap,
        rationalePrefix: `Basert på ${input.sourceLabel}`,
        fallbackRationale: `Basert på ${input.sourceLabel}: «${quote}»`,
      });
    case 'DISEASE':
      return buildSuggestionFromKnowledge({
        key: `NOTE:${input.noteId}:DISEASE`,
        title: `Sykdomstegn må følges opp: ${input.hiveLabel}`,
        severity: 'urgent',
        dueKind: 'TOMORROW',
        dueDate: toDateOnly(new Date()),
        knowledgeSlug: 'sykdomstegn',
        knowledgeMap: input.knowledgeMap,
        rationalePrefix: `Basert på ${input.sourceLabel}`,
        fallbackRationale: `Basert på ${input.sourceLabel}: «${quote}»`,
      });
    case 'SWARM':
      return buildSuggestionFromKnowledge({
        key: `NOTE:${input.noteId}:SWARM`,
        title: `Følg opp mulig svermetrang: ${input.hiveLabel}`,
        severity: 'info',
        dueKind: 'DAYS_3',
        dueDate: toDateOnly(new Date()),
        knowledgeSlug: 'svermetrang',
        knowledgeMap: input.knowledgeMap,
        rationalePrefix: `Basert på ${input.sourceLabel}`,
        fallbackRationale: `Basert på ${input.sourceLabel}: «${quote}»`,
      });
    case 'ACTIONABLE': {
      const title = sanitizeAuroraText(input.theme.sentences[0] || '');
      if (!title) return null;
      const due = smartDefaultDueMetaForSuggestion({
        noteText: input.noteText,
        suggestionTitle: title,
        nextPlannedDateISO: input.nextPlannedDateISO || null,
        earliestOpenTaskDueDateISO: input.earliestOpenTaskDueDateISO || null,
        fallbackDueKind: 'NEXT_VISIT',
        fallbackDueDate: toDateOnly(new Date()),
      });
      return {
        key: `NOTE:${input.noteId}:ACTIONABLE`,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        severity: 'info',
        dueKind: due.dueKind,
        dueDate: due.dueDate,
        rationale: `Basert på ${input.sourceLabel}: «${quote}»`,
        guidance: [],
      };
    }
    default:
      return null;
  }
}

function pushSuggestionsFromNote(input: {
  suggestions: AuroraSuggestion[];
  openTitles: Set<string>;
  noteId: string;
  noteText: string;
  hiveLabel: string;
  sourceLabel: string;
  knowledgeMap?: Map<string, AuroraKnowledgeItem>;
  nextPlannedDateISO?: string | null;
  earliestOpenTaskDueDateISO?: string | null;
  skipFeedRelated?: boolean;
}) {
  const themes = analyzeNoteThemes(input.noteText);
  for (const theme of themes) {
    if (input.skipFeedRelated && theme.key === 'FEED') continue;
    const suggestion = buildThemeSuggestion({
      theme,
      noteId: input.noteId,
      noteText: input.noteText,
      hiveLabel: input.hiveLabel,
      sourceLabel: input.sourceLabel,
      knowledgeMap: input.knowledgeMap,
      nextPlannedDateISO: input.nextPlannedDateISO || null,
      earliestOpenTaskDueDateISO: input.earliestOpenTaskDueDateISO || null,
    });
    if (!suggestion) continue;
    if (input.openTitles.has(suggestion.title.toLowerCase())) continue;
    if (input.skipFeedRelated && isFeedRelatedTitle(suggestion.title)) continue;
    upsertSuggestion(input.suggestions, suggestion);
  }
}

export function getInspectionValidationWarnings(input: InspectionBiologyInput) {
  const warnings: AuroraValidation[] = [];
  const brood = parseBroodCondition(input.brood_condition);
  const eggsSeen = input.eggs_seen === true ? true : input.eggs_seen === false ? false : null;
  const honey = normalizeHoneyStores(input.honey_stores);
  const status = String(input.status || '').trim().toLowerCase();

  if (eggsSeen === false && brood.egg !== 'lite') {
    warnings.push({
      key: 'EGGS_CONTRADICTION',
      severity: 'warning',
      title: 'Egg er ikke sett, men yngelleie viser egg som normalt eller mye.',
      message: 'Bekreft om dette er riktig før du lagrer, eller juster feltet for egg i yngelleiet.',
    });
  }

  if ((status === 'død' || status === 'dod') && (eggsSeen === true || brood.egg !== 'lite' || brood.larver !== 'lite' || brood.yngel !== 'lite')) {
    warnings.push({
      key: 'DEAD_WITH_BROOD',
      severity: 'warning',
      title: 'Kubestatus står som død, men inspeksjonen viser fortsatt aktivt yngelstadium.',
      message: 'Dette er biologisk motstridende i samme registrering og bør kontrolleres.',
    });
  }

  if (status === 'sterk' && brood.frames) {
    const frames = Number(String(brood.frames).replace(',', '.'));
    if (!Number.isNaN(frames) && frames > 0 && frames < 3) {
      warnings.push({
        key: 'STRONG_LOW_BROOD',
        severity: 'info',
        title: 'Kubestatus står som sterk, men rammer med yngel er registrert lavt.',
        message: 'Bekreft at bistyrken beskriver total styrke i kuben og ikke bare yngelmengden.',
      });
    }
  }

  if (status === 'svak' && brood.frames) {
    const frames = Number(String(brood.frames).replace(',', '.'));
    if (!Number.isNaN(frames) && frames >= 7) {
      warnings.push({
        key: 'WEAK_HIGH_BROOD',
        severity: 'info',
        title: 'Kubestatus står som svak, men rammer med yngel er registrert høyt.',
        message: 'Kontroller om status eller bistyrke bør justeres for å beskrive kuben bedre.',
      });
    }
  }

  if ((status === 'bytt dronning' || status === 'bytt dronning'.toLowerCase()) && eggsSeen === true && brood.egg === 'mye') {
    warnings.push({
      key: 'QUEEN_REPLACE_WITH_ACTIVE_EGGS',
      severity: 'info',
      title: 'Dronningbytte er markert, men inspeksjonen viser aktiv egglegging.',
      message: 'Dette kan være riktig, men bekreft at dronningbytte fortsatt er ønsket.',
    });
  }

  if (honey === 'lite' && hasPerformedAction(input.performed_actions, 'FEED_GIVEN')) {
    warnings.push({
      key: 'LOW_FEED_AFTER_FEEDING',
      severity: 'info',
      title: 'Fôr står fortsatt som lite selv om fôring er registrert i dag.',
      message: 'Det kan være riktig, men vurder om status bør beskrive nivå etter tiltak eller nivå ved funn.',
    });
  }

  return warnings;
}

export function buildAuroraSuggestionsForInspection(input: {
  hive: { id: string; hive_number?: string | number | null; name?: string | null };
  apiaryId: string;
  knowledgeMap?: Map<string, AuroraKnowledgeItem>;
  inspection: {
    id: string;
    inspection_date?: string | null;
    queen_seen?: boolean | null;
    eggs_seen?: boolean | null;
    brood_condition?: string | null;
    honey_stores?: string | null;
    status?: string | null;
    performed_actions?: any;
    notes?: string | null;
  };
  previousInspections?: Array<{ created_at?: string | null; honey_stores?: string | null; eggs_seen?: boolean | null; status?: string | null }>;
  openTaskTitlesLower?: Set<string>;
  recentNotes?: Array<{ id: string; note: string; created_at?: string | null }>;
  nextPlannedDateISO?: string | null;
  earliestOpenTaskDueDateISO?: string | null;
}) {
  const hiveLabel = input.hive?.hive_number ? `Kube ${input.hive.hive_number}` : input.hive?.name ? String(input.hive.name) : 'Kube';
  const openTitles = input.openTaskTitlesLower || new Set<string>();
  const suggestions: AuroraSuggestion[] = [];
  const brood = parseBroodCondition(input.inspection.brood_condition);
  const eggsSeen = input.inspection.eggs_seen === true ? true : input.inspection.eggs_seen === false ? false : null;
  const queenSeen = input.inspection.queen_seen === true ? true : input.inspection.queen_seen === false ? false : null;

  const honey = normalizeHoneyStores(input.inspection.honey_stores);
  if (honey === 'lite' && !hasPerformedAction(input.inspection.performed_actions, 'FEED_GIVEN')) {
    const lastHoney = normalizeHoneyStores(input.previousInspections?.[0]?.honey_stores);
    const severity: AuroraSeverity = lastHoney === 'lite' ? 'urgent' : 'warning';
    const dueKind: AuroraDueKind = severity === 'urgent' ? 'TOMORROW' : 'DAYS_3';
    const title = `Støttefôring: ${hiveLabel}`;
    if (!openTitles.has(title.toLowerCase())) {
      upsertSuggestion(suggestions, {
        ...buildSuggestionFromKnowledge({
          key: `FEED_SUPPORT:${input.hive.id}`,
          title,
          severity,
          dueKind,
          dueDate: toDateOnly(new Date()),
          knowledgeSlug: 'lav_matstatus',
          knowledgeMap: input.knowledgeMap,
          rationalePrefix: lastHoney === 'lite' ? 'Basert på dagens og forrige inspeksjon' : 'Basert på dagens inspeksjon',
          fallbackRationale:
            lastHoney === 'lite'
              ? 'Basert på dagens og forrige inspeksjon: Fôr = Lite uten registrert fôring.'
              : 'Basert på dagens inspeksjon: Fôr = Lite uten registrert fôring.',
        }),
      });
    }
  }

  const status = String(input.inspection.status || '').trim().toLowerCase();
  if (status === 'varroa mistanke') {
    const title = `Gjennomfør varroatest: ${hiveLabel}`;
    const hasAny = openTitles.has(title.toLowerCase()) || Array.from(openTitles).some((t) => t.includes('varroa'));
    if (!hasAny && !hasPerformedAction(input.inspection.performed_actions, 'VARROA_TEST_DONE') && !hasPerformedAction(input.inspection.performed_actions, 'VARROA_TREATED')) {
      suggestions.push(
        buildSuggestionFromKnowledge({
          key: `VARROA_TEST:${input.hive.id}`,
          title,
          severity: 'warning',
          dueKind: 'DAYS_3',
          dueDate: toDateOnly(new Date()),
          knowledgeSlug: 'varroa_mistanke',
          knowledgeMap: input.knowledgeMap,
          rationalePrefix: 'Basert på dagens inspeksjon',
          fallbackRationale: 'Basert på dagens inspeksjon: Kubestatus = Varroa mistanke.',
        })
      );
    }
  }

  if (status === 'sykdom') {
    const title = `Oppfølging sykdom: ${hiveLabel}`;
    const hasAny = openTitles.has(title.toLowerCase()) || Array.from(openTitles).some((t) => t.includes('sykdom'));
    if (!hasAny) {
      suggestions.push(
        buildSuggestionFromKnowledge({
          key: `DISEASE_FOLLOWUP:${input.hive.id}`,
          title,
          severity: 'urgent',
          dueKind: 'TOMORROW',
          dueDate: toDateOnly(new Date()),
          knowledgeSlug: 'sykdomstegn',
          knowledgeMap: input.knowledgeMap,
          rationalePrefix: 'Basert på dagens inspeksjon',
          fallbackRationale: 'Basert på dagens inspeksjon: Kubestatus = Sykdom.',
        })
      );
    }
  }

  if (status === 'bytt dronning') {
    const title = `Planlegg dronningbytte: ${hiveLabel}`;
    const hasAny = openTitles.has(title.toLowerCase()) || Array.from(openTitles).some((t) => t.includes('dronning'));
    if (!hasAny && !hasPerformedAction(input.inspection.performed_actions, 'QUEEN_REPLACED')) {
      suggestions.push(
        buildSuggestionFromKnowledge({
          key: `QUEEN_REPLACE_PLAN:${input.hive.id}`,
          title,
          severity: 'info',
          dueKind: 'NEXT_WEEK',
          dueDate: toDateOnly(new Date()),
          knowledgeSlug: 'dronningbytte',
          knowledgeMap: input.knowledgeMap,
          rationalePrefix: 'Basert på dagens inspeksjon',
          fallbackRationale: 'Basert på dagens inspeksjon: Kubestatus = Bytt Dronning.',
        })
      );
    }
  }

  if (eggsSeen === false && queenSeen === false && brood.egg === 'lite' && (brood.larver === 'lite' || brood.yngel === 'lite')) {
    const title = `Kontroller dronningsituasjonen: ${hiveLabel}`;
    const hasAny = openTitles.has(title.toLowerCase()) || Array.from(openTitles).some((t) => t.includes('dronning'));
    if (!hasAny) {
      suggestions.push(
        buildSuggestionFromKnowledge({
          key: `QUEEN_STATUS:${input.hive.id}`,
          title,
          severity: 'warning',
          dueKind: 'DAYS_3',
          dueDate: toDateOnly(new Date()),
          knowledgeSlug: 'dronningsituasjon',
          knowledgeMap: input.knowledgeMap,
          rationalePrefix: 'Basert på dagens inspeksjon',
          fallbackRationale: 'Basert på dagens inspeksjon: Ingen egg er sett og dronningsituasjonen virker usikker.',
        })
      );
    }
  }

  const inspectionNote = sanitizeAuroraText(String(input.inspection.notes || ''));
  const feedNoteMeta = getFeedFollowupMetaFromText(inspectionNote);
  if (feedNoteMeta && !hasPerformedAction(input.inspection.performed_actions, 'FEED_GIVEN')) {
    const title = `Støttefôring: ${hiveLabel}`;
    if (!openTitles.has(title.toLowerCase())) {
      upsertSuggestion(suggestions, {
        ...buildSuggestionFromKnowledge({
          key: `FEED_SUPPORT:${input.hive.id}`,
          title,
          severity: feedNoteMeta.severity,
          dueKind: feedNoteMeta.dueKind,
          dueDate: toDateOnly(new Date()),
          knowledgeSlug: 'lav_matstatus',
          knowledgeMap: input.knowledgeMap,
          rationalePrefix: 'Basert på notat i dagens inspeksjon',
          fallbackRationale: `Basert på notat i dagens inspeksjon: ${shortQuote(inspectionNote, 140)}`,
        }),
      });
    }
  }
  if (inspectionNote) {
    pushSuggestionsFromNote({
      suggestions,
      openTitles,
      noteId: `inspection-${input.inspection.id}`,
      noteText: inspectionNote,
      hiveLabel,
      sourceLabel: 'notat i dagens inspeksjon',
      knowledgeMap: input.knowledgeMap,
      nextPlannedDateISO: input.nextPlannedDateISO || null,
      earliestOpenTaskDueDateISO: input.earliestOpenTaskDueDateISO || null,
      skipFeedRelated: Boolean(feedNoteMeta),
    });
  }

  const notes = Array.isArray(input.recentNotes) ? input.recentNotes : [];
  for (const n of notes.slice(0, 6)) {
    pushSuggestionsFromNote({
      suggestions,
      openTitles,
      noteId: n.id,
      noteText: n.note,
      hiveLabel,
      sourceLabel: 'tidligere bigårdsnotat',
      knowledgeMap: input.knowledgeMap,
      nextPlannedDateISO: input.nextPlannedDateISO || null,
      earliestOpenTaskDueDateISO: input.earliestOpenTaskDueDateISO || null,
    });
  }

  const unique: AuroraSuggestion[] = [];
  const seenKeys = new Set<string>();
  for (const s of suggestions) {
    const k = String(s.key || '').trim();
    if (!k) continue;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    unique.push(s);
    if (unique.length >= 12) break;
  }

  const severityOrder: Record<AuroraSeverity, number> = { urgent: 0, warning: 1, info: 2 };
  unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return unique;
}

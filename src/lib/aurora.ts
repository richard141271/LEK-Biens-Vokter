export type AuroraDueKind = 'NEXT_VISIT' | 'TOMORROW' | 'DAYS_3' | 'NEXT_WEEK' | 'PICK_DATE';

export type AuroraSeverity = 'info' | 'warning' | 'urgent';

export type AuroraSuggestion = {
  key: string;
  title: string;
  rationale: string;
  severity: AuroraSeverity;
  dueKind: AuroraDueKind;
  dueDate: string;
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

export function suggestTasksFromText(raw: string) {
  const input = String(raw || '').trim();
  if (!input) return [];

  const chunks = input
    .split('\n')
    .flatMap((line) => line.split(/[.!?]/g))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  const normalizeTitle = (phrase: string) => {
    let p = String(phrase || '').trim();
    p = p.replace(/^[•*\-\u2022]\s+/, '').trim();
    p = p.replace(/\s+/g, ' ').trim();
    if (!p) return '';

    const lower = p.toLowerCase();
    const stripPrefixes = ['må ', 'må ', 'trenger å ', 'trenger å ', 'bør ', 'burde ', 'skal ', 'måtte ', 'notat: '];
    for (const pref of stripPrefixes) {
      if (lower.startsWith(pref)) {
        p = p.slice(pref.length).trim();
        break;
      }
    }

    const lower2 = p.toLowerCase();
    if (lower2.startsWith('mangler ')) {
      const rest = p.slice('mangler '.length).trim();
      return rest ? `Skaff ${rest}` : 'Skaff utstyr';
    }

    const startsWithVerb =
      /^(rydd|rydde|flytt|flytte|reparer|reparere|hent|hente|skaff|fiks|ordne|sjekk|rengjør|bekjemp|forbered|planlegg)\b/i.test(
        p
      );
    if (startsWithVerb) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }

    return `Følg opp: ${p}`;
  };

  const suggestions: Array<{ key: string; title: string }> = [];
  for (let i = 0; i < chunks.length; i++) {
    const title = normalizeTitle(chunks[i]);
    if (!title) continue;
    const key = `${i}-${title.toLowerCase()}`;
    if (suggestions.some((s) => s.key === key)) continue;
    suggestions.push({ key, title });
  }

  if (suggestions.length === 0) {
    const fallback = normalizeTitle(input.split('\n')[0] || input);
    if (fallback) suggestions.push({ key: `0-${fallback.toLowerCase()}`, title: fallback });
  }

  return suggestions;
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

function hasPerformedAction(performedActions: any, id: string) {
  const list = Array.isArray(performedActions) ? performedActions : [];
  return list.some((a) => String(a?.id || '').toUpperCase() === id.toUpperCase());
}

function pushSuggestionsFromNote(input: {
  suggestions: AuroraSuggestion[];
  openTitles: Set<string>;
  noteId: string;
  noteText: string;
  rationalePrefix: string;
  nextPlannedDateISO?: string | null;
  earliestOpenTaskDueDateISO?: string | null;
}) {
  const noteSuggestions = suggestTasksFromText(input.noteText).slice(0, 4);
  for (const s of noteSuggestions) {
    const title = s.title;
    if (!title) continue;
    if (input.openTitles.has(title.toLowerCase())) continue;
    input.suggestions.push({
      key: `NOTE:${input.noteId}:${s.key}`,
      title,
      severity: 'info',
      ...smartDefaultDueMetaForSuggestion({
        noteText: input.noteText,
        suggestionTitle: title,
        nextPlannedDateISO: input.nextPlannedDateISO || null,
        earliestOpenTaskDueDateISO: input.earliestOpenTaskDueDateISO || null,
        fallbackDueKind: 'NEXT_VISIT',
        fallbackDueDate: toDateOnly(new Date()),
      }),
      rationale: `${input.rationalePrefix}: «${shortQuote(input.noteText, 120)}»`,
    });
  }
}

export function buildAuroraSuggestionsForInspection(input: {
  hive: { id: string; hive_number?: string | number | null; name?: string | null };
  apiaryId: string;
  inspection: {
    id: string;
    inspection_date?: string | null;
    honey_stores?: string | null;
    status?: string | null;
    performed_actions?: any;
    notes?: string | null;
  };
  previousInspections?: Array<{ created_at?: string | null; honey_stores?: string | null }>;
  openTaskTitlesLower?: Set<string>;
  recentNotes?: Array<{ id: string; note: string; created_at?: string | null }>;
  nextPlannedDateISO?: string | null;
  earliestOpenTaskDueDateISO?: string | null;
}) {
  const hiveLabel = input.hive?.hive_number ? `Kube ${input.hive.hive_number}` : input.hive?.name ? String(input.hive.name) : 'Kube';
  const openTitles = input.openTaskTitlesLower || new Set<string>();
  const suggestions: AuroraSuggestion[] = [];

  const honey = normalizeHoneyStores(input.inspection.honey_stores);
  if (honey === 'lite' && !hasPerformedAction(input.inspection.performed_actions, 'FEED_GIVEN')) {
    const lastHoney = normalizeHoneyStores(input.previousInspections?.[0]?.honey_stores);
    const severity: AuroraSeverity = lastHoney === 'lite' ? 'urgent' : 'warning';
    const dueKind: AuroraDueKind = severity === 'urgent' ? 'TOMORROW' : 'DAYS_3';
    const title = `Støttefôring: ${hiveLabel}`;
    if (!openTitles.has(title.toLowerCase())) {
      suggestions.push({
        key: `FEED_SUPPORT:${input.hive.id}`,
        title,
        severity,
        dueKind,
        dueDate: toDateOnly(new Date()),
        rationale:
          severity === 'urgent'
            ? 'Basert på dagens og forrige inspeksjon: Fôr = Lite uten registrert fôring. Følg opp raskt, vurder støttefôring nå og se til kuben senest neste dag.'
            : 'Basert på dagens inspeksjon: Fôr = Lite uten registrert fôring. Vurder støttefôring og legg oppfølging innen få dager.',
      });
    }
  }

  const status = String(input.inspection.status || '').trim().toLowerCase();
  if (status === 'varroa mistanke') {
    const title = `Gjennomfør varroatest: ${hiveLabel}`;
    const hasAny = openTitles.has(title.toLowerCase()) || Array.from(openTitles).some((t) => t.includes('varroa'));
    if (!hasAny && !hasPerformedAction(input.inspection.performed_actions, 'VARROA_TEST_DONE') && !hasPerformedAction(input.inspection.performed_actions, 'VARROA_TREATED')) {
      suggestions.push({
        key: `VARROA_TEST:${input.hive.id}`,
        title,
        severity: 'warning',
        dueKind: 'DAYS_3',
        dueDate: toDateOnly(new Date()),
        rationale: `Basert på dagens inspeksjon: Kubestatus = Varroa mistanke, og det er ikke registrert varroatest eller behandling i dag.`,
      });
    }
  }

  if (status === 'sykdom') {
    const title = `Oppfølging sykdom: ${hiveLabel}`;
    const hasAny = openTitles.has(title.toLowerCase()) || Array.from(openTitles).some((t) => t.includes('sykdom'));
    if (!hasAny) {
      suggestions.push({
        key: `DISEASE_FOLLOWUP:${input.hive.id}`,
        title,
        severity: 'urgent',
        dueKind: 'TOMORROW',
        dueDate: toDateOnly(new Date()),
        rationale: `Basert på dagens inspeksjon: Kubestatus = Sykdom. Lag en konkret oppfølgingsoppgave slik at funn og tiltak ikke blir glemt.`,
      });
    }
  }

  if (status === 'bytt dronning') {
    const title = `Planlegg dronningbytte: ${hiveLabel}`;
    const hasAny = openTitles.has(title.toLowerCase()) || Array.from(openTitles).some((t) => t.includes('dronning'));
    if (!hasAny && !hasPerformedAction(input.inspection.performed_actions, 'QUEEN_REPLACED')) {
      suggestions.push({
        key: `QUEEN_REPLACE_PLAN:${input.hive.id}`,
        title,
        severity: 'info',
        dueKind: 'NEXT_WEEK',
        dueDate: toDateOnly(new Date()),
        rationale: `Basert på dagens inspeksjon: Kubestatus = Bytt Dronning, og dronningbytte er ikke registrert som utført i dag.`,
      });
    }
  }

  const inspectionNote = String(input.inspection.notes || '').trim();
  if (inspectionNote) {
    pushSuggestionsFromNote({
      suggestions,
      openTitles,
      noteId: `inspection-${input.inspection.id}`,
      noteText: inspectionNote,
      rationalePrefix: 'Basert på notat i dagens inspeksjon',
      nextPlannedDateISO: input.nextPlannedDateISO || null,
      earliestOpenTaskDueDateISO: input.earliestOpenTaskDueDateISO || null,
    });
  }

  const notes = Array.isArray(input.recentNotes) ? input.recentNotes : [];
  for (const n of notes.slice(0, 6)) {
    pushSuggestionsFromNote({
      suggestions,
      openTitles,
      noteId: n.id,
      noteText: n.note,
      rationalePrefix: 'Basert på tidligere bigårdsnotat',
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

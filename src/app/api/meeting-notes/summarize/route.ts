import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';

const ERROR_TITLE = 'Transkripsjon feilet – lydopptaket er lagret';

const trimTranscriptForModel = (text: string, maxChars: number) => {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const half = Math.floor(maxChars / 2);
  return (trimmed.slice(0, half) + '\n...\n' + trimmed.slice(-half)).trim();
};

const safeParseJson = (text: string) => {
  const raw = text.trim();
  try {
    return JSON.parse(raw);
  } catch {}

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return null;
};

const normalizeForRepeat = (s: string) => {
  return s
    .toLowerCase()
    .replace(/[^0-9a-zA-ZæøåÆØÅ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitIntoSentences = (text: string) => {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const stabilizeTranscript = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const sentences = splitIntoSentences(trimmed);
  const out: string[] = [];

  let i = 0;
  while (i < sentences.length) {
    const current = sentences[i];
    const currentKey = normalizeForRepeat(current);

    let run = 1;
    while (i + run < sentences.length && normalizeForRepeat(sentences[i + run]) === currentKey) {
      run += 1;
    }

    if (run >= 6) {
      out.push(current);
      i += run;
      continue;
    }

    for (let j = 0; j < run; j += 1) out.push(sentences[i + j]);
    i += run;
  }

  return out.join(' ').replace(/\s+/g, ' ').trim();
};

const transcriptLooksBroken = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const sentences = splitIntoSentences(trimmed);
  let maxRun = 1;
  let currentRun = 1;

  for (let i = 1; i < sentences.length; i += 1) {
    if (normalizeForRepeat(sentences[i]) === normalizeForRepeat(sentences[i - 1])) {
      currentRun += 1;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 1;
    }
  }

  return maxRun >= 6;
};

const findOverlap = (aRaw: string, bRaw: string) => {
  const a = aRaw.replace(/\s+/g, ' ').trim().toLowerCase();
  const b = bRaw.replace(/\s+/g, ' ').trim().toLowerCase();
  const maxLen = Math.min(a.length, b.length, 300);
  const minLen = 18;
  for (let len = maxLen; len >= minLen; len -= 1) {
    if (a.slice(-len) === b.slice(0, len)) return len;
  }
  return 0;
};

const buildTranscriptFromSegments = (segments: any[]) => {
  const parsed = segments
    .map((s) => ({
      start: typeof s?.start === 'number' ? s.start : Number(s?.start),
      end: typeof s?.end === 'number' ? s.end : Number(s?.end),
      text: typeof s?.text === 'string' ? s.text.trim() : '',
    }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.text);

  parsed.sort((a, b) => a.start - b.start);

  let out = '';
  let lastStart = -1;
  let lastEnd = -1;
  let lastKey = '';

  for (const seg of parsed) {
    const key = `${Math.round(seg.start * 100)}/${Math.round(seg.end * 100)}/${normalizeForRepeat(seg.text)}`;
    if (seg.start === lastStart && seg.end === lastEnd && key === lastKey) {
      continue;
    }
    lastStart = seg.start;
    lastEnd = seg.end;
    lastKey = key;

    if (!out) {
      out = seg.text;
      continue;
    }

    const tail = out.slice(Math.max(0, out.length - 350));
    const head = seg.text.slice(0, 350);
    const overlap = findOverlap(tail, head);
    const toAppend = overlap > 0 ? seg.text.slice(overlap).trimStart() : seg.text;

    if (toAppend) {
      out = `${out}${out.endsWith(' ') ? '' : ' '}${toAppend}`;
    }
  }

  return out.replace(/\s+/g, ' ').trim();
};

const generateFallback = (transcript: string) => {
  const lines = transcript
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const actionCandidates = lines.filter((l) => {
    const lower = l.toLowerCase();
    return (
      lower.includes('vi skal') ||
      lower.includes('skal ') ||
      lower.includes('må ') ||
      lower.includes('avtalt') ||
      lower.includes('oppfølging') ||
      lower.includes('sender') ||
      lower.includes('bestiller')
    );
  });

  const uniqueActions: string[] = [];
  for (const line of actionCandidates) {
    const cleaned = line.replace(/^[-•–]\s*/, '').trim();
    if (!cleaned) continue;
    if (uniqueActions.some((a) => a.toLowerCase() === cleaned.toLowerCase())) continue;
    uniqueActions.push(cleaned);
    if (uniqueActions.length >= 10) break;
  }

  const summary =
    lines.slice(0, 12).join(' ') ||
    transcript.trim().slice(0, 1200) ||
    'Dette er et lagret møteopptak uten automatisk tekstlig oppsummering.';

  return {
    title: null as string | null,
    summary,
    action_points: uniqueActions.map((a) => a).join('\n') || null,
  };
};

const generateWithOpenAI = async (transcript: string) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const promptTranscript = trimTranscriptForModel(transcript, 140_000);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Du er en assistent som lager møtereferat på norsk. Svar kun som gyldig JSON med feltene: title (string), summary (string), action_points (string). action_points skal være ett punkt per linje, uten nummerering.',
        },
        {
          role: 'user',
          content: `Transkripsjon:\n${promptTranscript}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    return null;
  }

  const json = (await res.json().catch(() => null)) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) return null;

  const parsed = safeParseJson(content);
  if (!parsed || typeof parsed !== 'object') return null;

  const title = typeof parsed.title === 'string' ? parsed.title.trim() : null;
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : null;
  const actionPoints =
    typeof parsed.action_points === 'string' ? parsed.action_points.trim() : null;

  return {
    title: title && title.length > 0 ? title : null,
    summary: summary && summary.length > 0 ? summary : null,
    action_points: actionPoints && actionPoints.length > 0 ? actionPoints : null,
  };
};

const transcribeWithOpenAI = async (buffer: Buffer, mimeType: string, fileName: string) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || 'application/octet-stream' });
  form.append('file', blob, fileName);
  form.append('model', 'whisper-1');
  form.append('language', 'no');
  form.append('temperature', '0');
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as any;
  const fromSegments = Array.isArray(json?.segments) ? buildTranscriptFromSegments(json.segments) : '';
  const text = fromSegments || (typeof json?.text === 'string' ? json.text.trim() : '');
  const stabilized = stabilizeTranscript(text);
  return stabilized || null;
};

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: 'Mangler referat-id' }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('meeting_notes')
      .select('id, user_id, title, transcript, summary, action_points, audio_url')
      .eq('id', body.id)
      .single();

    if (error || !note) {
      return NextResponse.json({ error: 'Referat ikke funnet' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' || user.email === 'richard141271@gmail.com';
    if (note.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Ingen tilgang til dette referatet' }, { status: 403 });
    }

    let transcript = typeof note.transcript === 'string' ? note.transcript.trim() : '';
    const shouldRetranscribe = transcript && transcriptLooksBroken(transcript);
    if (!transcript || shouldRetranscribe) {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY mangler på server. Kan ikke transkribere opptaket.' },
          { status: 400 },
        );
      }
      if (!note.audio_url) {
        return NextResponse.json({ error: 'Mangler lydfil' }, { status: 400 });
      }

      const admin = createAdminClient();
      const bucketName = 'meeting-audio';
      const audioPath = note.audio_url;

      const { data: downloaded, error: downloadError } = await admin.storage
        .from(bucketName)
        .download(audioPath);

      if (downloadError || !downloaded) {
        return NextResponse.json({ error: 'Kunne ikke hente lydfil' }, { status: 500 });
      }

      const mimeType = downloaded.type || 'audio/webm';
      const fileName = audioPath.split('/').pop() || 'meeting.webm';
      const buffer = Buffer.from(await downloaded.arrayBuffer());
      const transcribed = await transcribeWithOpenAI(buffer, mimeType, fileName);

      if (!transcribed) {
        return NextResponse.json({ error: 'Kunne ikke transkribere opptaket' }, { status: 500 });
      }

      transcript = transcribed;
      await supabase
        .from('meeting_notes')
        .update({ transcript })
        .eq('id', body.id);
    }

    const ai = await generateWithOpenAI(transcript);
    const generated = ai ?? generateFallback(transcript);

    const nextTitle =
      note.title && note.title.trim() && note.title !== ERROR_TITLE
        ? note.title
        : generated.title;

    const updatePayload = {
      title: nextTitle || note.title,
      summary: generated.summary || note.summary,
      action_points: generated.action_points || note.action_points,
    };

    const { data: updated, error: updateError } = await supabase
      .from('meeting_notes')
      .update(updatePayload)
      .eq('id', body.id)
      .select('id, title, transcript, summary, action_points, audio_url, date, duration')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Kunne ikke oppdatere referat' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Uventet feil i meeting-notes/summarize', error);
    return NextResponse.json({ error: 'Uventet feil' }, { status: 500 });
  }
}

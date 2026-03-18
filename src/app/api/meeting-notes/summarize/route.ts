import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
      .select('id, user_id, title, transcript, summary, action_points')
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

    const transcript = typeof note.transcript === 'string' ? note.transcript.trim() : '';
    if (!transcript) {
      return NextResponse.json({ error: 'Mangler transkripsjon' }, { status: 400 });
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

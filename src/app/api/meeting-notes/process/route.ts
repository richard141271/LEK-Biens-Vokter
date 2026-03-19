import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';

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

const trimTranscriptForModel = (text: string, maxChars: number) => {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const half = Math.floor(maxChars / 2);
  return (trimmed.slice(0, half) + '\n...\n' + trimmed.slice(-half)).trim();
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

const summarizeWithOpenAI = async (transcript: string) => {
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
            'Du lager møtereferat på norsk. Svar kun som gyldig JSON med feltene: title (string), summary (string), action_points (string). action_points skal være ett punkt per linje, uten nummerering.',
        },
        { role: 'user', content: `Transkripsjon:\n${promptTranscript}` },
      ],
    }),
  });

  if (!res.ok) return null;
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

    const adminClient = createAdminClient();
    const bucketName = 'meeting-audio';

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing in environment variables');
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY mangler i miljøvariabler' },
        { status: 500 }
      );
    }

    const { error: bucketError } = await adminClient.storage.getBucket(bucketName);

    if (bucketError && bucketError.message && bucketError.message.toLowerCase().includes('not found')) {
      const { error: createBucketError } = await adminClient.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 314572800,
        allowedMimeTypes: ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg'],
      });

      if (createBucketError) {
        const rawMessage =
          typeof createBucketError.message === 'string'
            ? createBucketError.message
            : JSON.stringify(createBucketError);
        const message = rawMessage.toLowerCase();
        if (!message.includes('exists')) {
          console.error('Create bucket error', createBucketError);
          return NextResponse.json(
            {
              error: 'Kunne ikke opprette lagringsplass for lyd',
              details: rawMessage,
            },
            { status: 500 }
          );
        }
      }
    } else if (bucketError) {
      console.error('Get bucket error', bucketError);
    }

    const contentType = request.headers.get('content-type') || '';

    let durationSeconds = 0;
    let filePath = '';
    let fileName = '';
    let baseMimeType = 'audio/webm';
    let buffer: Buffer | null = null;

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as {
        audioPath?: string;
        duration_seconds?: number | string;
        mimeType?: string;
        fileName?: string;
      };

      filePath = typeof body.audioPath === 'string' ? body.audioPath.trim() : '';
      fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
      baseMimeType =
        typeof body.mimeType === 'string' && body.mimeType.trim()
          ? body.mimeType.split(';')[0].trim()
          : baseMimeType;

      durationSeconds =
        typeof body.duration_seconds === 'number'
          ? Math.max(0, Math.floor(body.duration_seconds))
          : typeof body.duration_seconds === 'string'
            ? parseInt(body.duration_seconds, 10) || 0
            : 0;

      if (!filePath) {
        return NextResponse.json({ error: 'Mangler lydsti' }, { status: 400 });
      }

      if (!filePath.startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: 'Ingen tilgang til lydfil' }, { status: 403 });
      }

      if (!fileName) {
        fileName = filePath.split('/').pop() || `meeting.${baseMimeType === 'audio/mp4' ? 'm4a' : 'webm'}`;
      }
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const durationSecondsRaw = formData.get('duration_seconds') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'Mangler lydfil' }, { status: 400 });
      }

      durationSeconds = durationSecondsRaw ? parseInt(durationSecondsRaw, 10) || 0 : 0;

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      const fileExt = file.name.split('.').pop() || 'webm';
      fileName = `${user.id}-${Date.now()}.${fileExt}`;
      filePath = `${user.id}/${fileName}`;

      baseMimeType = file.type ? file.type.split(';')[0].trim() : baseMimeType;

      const { error: uploadError } = await adminClient.storage.from(bucketName).upload(filePath, buffer, {
        contentType: baseMimeType,
        upsert: false,
      });

      if (uploadError) {
        console.error('Upload error', uploadError);
        const uploadDetails =
          typeof uploadError.message === 'string'
            ? uploadError.message
            : JSON.stringify(uploadError);
        return NextResponse.json(
          { error: 'Kunne ikke lagre lydfil', details: uploadDetails },
          { status: 500 },
        );
      }

      const { error: ownerError } = await adminClient
        .from('storage.objects')
        .update({ owner: user.id })
        .eq('bucket_id', bucketName)
        .eq('name', filePath);

      if (ownerError) {
        console.error('Owner update error', ownerError);
      }
    }

    const title = 'Møteopptak ' + new Date().toLocaleString('no-NO');

    const { data: inserted, error: insertError } = await adminClient
      .from('meeting_notes')
      .insert({
        user_id: user.id,
        title,
        date: new Date().toISOString(),
        duration: durationSeconds,
        audio_url: filePath,
        transcript: null,
        summary: null,
        action_points: null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('DB insert error', insertError);
      return NextResponse.json({ error: 'Kunne ikke lagre referat' }, { status: 500 });
    }

    if (!buffer) {
      const { data: downloaded, error: downloadError } = await adminClient.storage
        .from(bucketName)
        .download(filePath);
      if (!downloadError && downloaded) {
        buffer = Buffer.from(await downloaded.arrayBuffer());
        baseMimeType = downloaded.type || baseMimeType;
      }
    }

    const transcript = buffer ? await transcribeWithOpenAI(buffer, baseMimeType || 'audio/webm', fileName) : null;
    if (transcript) {
      const minutes = await summarizeWithOpenAI(transcript);
      const nextTitle = minutes?.title && minutes.title.trim() ? minutes.title.trim() : null;
      await adminClient
        .from('meeting_notes')
        .update({
          title: nextTitle || title,
          transcript,
          summary: minutes?.summary ?? null,
          action_points: minutes?.action_points ?? null,
        })
        .eq('id', inserted.id);
    }

    return NextResponse.json({ id: inserted.id });
  } catch (error) {
    console.error('Unexpected error in meeting-notes/process', error);
    return NextResponse.json({ error: 'Uventet feil' }, { status: 500 });
  }
}

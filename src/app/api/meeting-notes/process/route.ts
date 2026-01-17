import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const durationSecondsRaw = formData.get('duration_seconds') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Mangler lydfil' }, { status: 400 });
    }

    const durationSeconds = durationSecondsRaw ? parseInt(durationSecondsRaw, 10) || 0 : 0;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExt = file.name.split('.').pop() || 'webm';
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

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
        fileSizeLimit: 104857600,
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

    const { error: uploadError } = await adminClient.storage.from(bucketName).upload(filePath, buffer, {
      contentType: file.type || 'audio/webm',
      upsert: false,
    });

    if (uploadError) {
      console.error('Upload error', uploadError);
      return NextResponse.json({ error: 'Kunne ikke lagre lydfil' }, { status: 500 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY mangler i miljøvariabler' }, { status: 500 });
    }

    const whisperFormData = new FormData();
    whisperFormData.append('file', new Blob([buffer], { type: file.type || 'audio/webm' }), fileName);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'no');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper error', whisperResponse.status, errorText);
      return NextResponse.json({ error: 'Feil ved transkripsjon av lydfil' }, { status: 502 });
    }

    const whisperData = (await whisperResponse.json()) as { text?: string };
    const transcript = whisperData.text || '';

    if (!transcript) {
      return NextResponse.json({ error: 'Transkripsjon mislyktes' }, { status: 502 });
    }

    const systemPrompt =
      'Du er en profesjonell referatskriver på norsk. Lag et tydelig, strukturert møtereferat basert på teksten.';

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content:
              'Lag et strukturert JSON-svar med følgende format:\n{\n  "summary": "Kort oppsummering av møtet",\n  "decisions": ["beslutning 1", "beslutning 2"],\n  "action_points": ["oppgave 1", "oppgave 2"]\n}\n\nMøtereferatets rå transkripsjon er:\n\n' +
              transcript,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'meeting_minutes',
            schema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                decisions: { type: 'array', items: { type: 'string' } },
                action_points: { type: 'array', items: { type: 'string' } },
              },
              required: ['summary', 'decisions', 'action_points'],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT error', gptResponse.status, errorText);
      return NextResponse.json({ error: 'Feil ved generering av referat' }, { status: 502 });
    }

    const gptJson = await gptResponse.json();
    const contentRaw =
      gptJson.choices?.[0]?.message?.content && typeof gptJson.choices[0].message.content === 'string'
        ? gptJson.choices[0].message.content
        : JSON.stringify(gptJson.choices?.[0]?.message?.content || {});

    let parsed: { summary?: string; decisions?: string[]; action_points?: string[] } = {};
    try {
      parsed = JSON.parse(contentRaw);
    } catch (e) {
      console.warn('Failed to parse GPT json content, falling back to raw', e);
    }

    const title =
      parsed.summary && parsed.summary.length > 0
        ? parsed.summary.slice(0, 80)
        : 'Møtereferat ' + new Date().toLocaleString('no-NO');

    const { data: inserted, error: insertError } = await adminClient
      .from('meeting_notes')
      .insert({
        user_id: user.id,
        title,
        date: new Date().toISOString(),
        duration: durationSeconds,
        audio_url: filePath,
        transcript,
        summary: parsed.summary || '',
        action_points: (parsed.action_points || []).join('\n'),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('DB insert error', insertError);
      return NextResponse.json({ error: 'Kunne ikke lagre referat' }, { status: 500 });
    }

    return NextResponse.json({ id: inserted.id });
  } catch (error) {
    console.error('Unexpected error in meeting-notes/process', error);
    return NextResponse.json({ error: 'Uventet feil' }, { status: 500 });
  }
}

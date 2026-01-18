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

    const body = (await request.json()) as { id?: string; audioPath?: string };

    if (!body.id && !body.audioPath) {
      return NextResponse.json({ error: 'Mangler referat-id eller lydsti' }, { status: 400 });
    }

    let audioPath = body.audioPath || null;

    if (!audioPath && body.id) {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('id, user_id, audio_url')
        .eq('id', body.id)
        .single();

      if (error || !data) {
        console.error('Kunne ikke hente meeting_note for audio-url', error);
        return NextResponse.json({ error: 'Referat ikke funnet' }, { status: 404 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin' || user.email === 'richard141271@gmail.com';

      if (data.user_id !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Ingen tilgang til dette referatet' }, { status: 403 });
      }

      audioPath = data.audio_url;
    }

    if (!audioPath) {
      return NextResponse.json({ error: 'Ingen lydfil knyttet til referatet' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const bucketName = 'meeting-audio';

    const { data: signed, error: signedError } = await adminClient.storage
      .from(bucketName)
      .createSignedUrl(audioPath, 60 * 60);

    if (signedError || !signed?.signedUrl) {
      console.error('Feil ved opprettelse av signed URL (server)', signedError);
      return NextResponse.json(
        { error: 'Kunne ikke generere lenke til lydfil', details: signedError?.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    console.error('Uventet feil i meeting-notes/audio-url', error);
    return NextResponse.json({ error: 'Uventet feil' }, { status: 500 });
  }
}

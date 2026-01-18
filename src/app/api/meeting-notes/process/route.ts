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
        fileSizeLimit: 52428800,
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

    const baseMimeType = file.type ? file.type.split(';')[0].trim() : 'audio/webm';

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

    // VERIFY UPLOAD: List files in the folder to confirm existence
    const { data: listData, error: listError } = await adminClient.storage
      .from(bucketName)
      .list(user.id);
    
    console.log('Upload verification - list files in user folder:', user.id, listData, listError);

    const uploadedFileExists = listData?.some(f => f.name === fileName);
    if (!uploadedFileExists) {
      console.error('File uploaded but not found in listing:', fileName, listData);
      return NextResponse.json(
        { error: 'Fil lastet opp, men kunne ikke verifiseres', details: 'File not found in storage listing after upload' },
        { status: 500 }
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

    return NextResponse.json({ id: inserted.id });
  } catch (error) {
    console.error('Unexpected error in meeting-notes/process', error);
    return NextResponse.json({ error: 'Uventet feil' }, { status: 500 });
  }
}

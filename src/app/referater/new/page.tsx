'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, Square, X, Check, Loader2 } from 'lucide-react';

export default function NewMeetingRecordingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?next=/referater/new');
        return;
      }

      setLoadingUser(false);
    };

    checkUser();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!recordedBlob) {
      setRecordedUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    setRecordedUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [recordedBlob]);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Let browser choose default if none match
  };

  const createRecorder = (stream: MediaStream, mimeType: string) => {
    const bitRate = 16000;
    const candidates: MediaRecorderOptions[] = [];

    if (mimeType) {
      candidates.push({ mimeType, audioBitsPerSecond: bitRate }, { mimeType });
    }
    candidates.push({ audioBitsPerSecond: bitRate }, {});

    for (const options of candidates) {
      try {
        return new MediaRecorder(stream, options);
      } catch {}
    }

    try {
      return new MediaRecorder(stream);
    } catch {}

    return null;
  };

  const handleStartRecording = async () => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Nettleseren din støtter ikke mikrofonopptak.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setError('Nettleseren din støtter ikke lydopptak (MediaRecorder).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
      });
      const mimeType = getSupportedMimeType();

      const recorder = createRecorder(stream, mimeType);
      if (!recorder) {
        stream.getTracks().forEach((track) => track.stop());
        setError('Kunne ikke starte opptak i denne nettleseren.');
        return;
      }
      chunksRef.current = [];
      setRecordedBlob(null);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError('Opptaket feilet. Prøv igjen.');
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const firstChunk = chunksRef.current[0] as Blob | undefined;
        // Prefer explicit mimeType from init, fallback to chunk type, then default
        const finalMimeType = recorder.mimeType || mimeType || (firstChunk?.type) || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        if (blob.size === 0) {
          setError('Opptaket ble tomt. Sjekk mikrofontilgang og prøv igjen.');
          setRecordedBlob(null);
        } else {
          setRecordedBlob(blob);
        }
        setRecording(false);
        stopTimer();
      };

      mediaRecorderRef.current = recorder;
      try {
        recorder.start(1000);
      } catch {
        recorder.start();
      }
      setRecording(true);
      startTimer();
    } catch (err) {
      console.error('Error starting recording', err);
      setError('Kunne ikke starte opptak. Sjekk mikrofontilgang.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.requestData();
      } catch {}
      mediaRecorderRef.current.stop();
    }
  };

  const handleDiscard = () => {
    setRecordedBlob(null);
    setElapsedSeconds(0);
    setError(null);
  };

  const handleSaveRecording = async () => {
    if (!recordedBlob) return;
    if (recordedBlob.size === 0) {
      setError('Opptaket ble tomt. Prøv igjen og sjekk mikrofontilgang.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?next=/referater/new');
        return;
      }

      const baseMimeType = recordedBlob.type ? recordedBlob.type.split(';')[0].trim() : 'audio/webm';

      let extension = 'webm';
      if (baseMimeType === 'audio/mp4') {
        extension = 'm4a';
      } else if (baseMimeType === 'audio/mpeg') {
        extension = 'mp3';
      } else if (baseMimeType === 'audio/ogg') {
        extension = 'ogg';
      }

      const fileName = `${user.id}-${Date.now()}.${extension}`;
      const audioPath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('meeting-audio').upload(audioPath, recordedBlob, {
        contentType: baseMimeType || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message || 'Kunne ikke laste opp lydfil.');
      }

      const res = await fetch('/api/meeting-notes/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioPath,
          duration_seconds: elapsedSeconds,
          mimeType: baseMimeType,
          fileName,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Ukjent feil ved behandling av opptak.');
      }

      const data = await res.json();

      if (!data || !data.id) {
        throw new Error('Uventet svar fra server.');
      }

      router.push(`/referater/${data.id}`);
    } catch (err: any) {
      console.error('Processing error', err);
      setError(err.message || 'Kunne ikke behandle opptaket.');
    } finally {
      setProcessing(false);
    }
  };

  if (loadingUser) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-honey-500 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/honeycomb.png')] opacity-20"></div>
        <div className="max-w-md mx-auto relative z-10">
          <button
            onClick={() => router.push('/referater')}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake til referater
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Nytt møteopptak</h1>
              <p className="text-honey-100 text-sm">Ta opp møtet og la AI skrive referatet.</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-black/20 rounded-full px-4 py-1 text-sm">
            <span className="opacity-80">Opptakstid</span>
            <span className="font-mono font-bold">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10 relative z-20 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-honey-100 text-center">
          <p className="text-gray-600 mb-6">
            Trykk på start for å begynne opptaket. Når møtet er ferdig, stopper du opptaket og velger om du vil lagre
            eller forkaste opptaket.
          </p>

          <div className="flex justify-center mb-4">
            {recording ? (
              <button
                onClick={handleStopRecording}
                className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Square className="w-10 h-10 text-white" />
              </button>
            ) : (
              <button
                onClick={handleStartRecording}
                className="w-24 h-24 rounded-full bg-honey-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Opptaket lagres lokalt på enheten mens du spiller inn, og lastes først opp når du velger &quot;Lagre
            opptak&quot;.
          </p>

          {recordedBlob && !recording && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-700">
                Opptak klart. Varighet: <span className="font-mono font-bold">{formatTime(elapsedSeconds)}</span>
              </p>
              {recordedUrl && (
                <audio
                  controls
                  src={recordedUrl}
                  className="w-full"
                  onError={() => setError('Kunne ikke spille av opptaket lokalt.')}
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDiscard}
                  disabled={processing}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Forkast opptak
                </button>
                <button
                  onClick={handleSaveRecording}
                  disabled={processing}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Laster opp...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lagre opptak
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!recordedBlob && !recording && (
            <p className="mt-4 text-xs text-gray-400">Tips: Test gjerne funksjonen i et kort opptak først.</p>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm text-left">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, MessageSquare, Send, Trash2, Bug, Lightbulb, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

type FeedbackType = 'bug' | 'wish' | 'feedback';

export default function FeedbackPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const [step, setStep] = useState<'choose' | 'form' | 'done'>('choose');
  const [type, setType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const sourceRoute = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      return (
        window.localStorage.getItem('lek_last_user_pathname') ||
        window.localStorage.getItem('lek_prev_pathname') ||
        ''
      );
    } catch {
      return '';
    }
  }, []);

  const appVersion = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      return String((window as any).__NEXT_DATA__?.buildId || '');
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const u = auth?.user || null;
        if (!u) {
          router.push('/login');
          return;
        }
        if (!mounted) return;
        setUserId(u.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', u.id)
          .maybeSingle();

        const name = profile?.full_name ? String(profile.full_name) : (u.user_metadata?.full_name ? String(u.user_metadata.full_name) : '');
        setUserName(name || u.email || u.id.slice(0, 8));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const deviceInfo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return {
        userAgent: window.navigator.userAgent,
        language: window.navigator.language,
        platform: (window.navigator as any).platform || '',
        screen: {
          w: window.screen?.width || 0,
          h: window.screen?.height || 0,
          dpr: window.devicePixelRatio || 1,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch {
      return null;
    }
  }, []);

  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

  const pickImages = () => {
    fileInputRef.current?.click();
  };

  const onFilesPicked = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming).filter(Boolean);
    if (next.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev, ...next];
      return merged.slice(0, 6);
    });
  };

  const removeFileAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const typeCard = (t: FeedbackType) => {
    if (t === 'bug') return { title: '🐞 Feil', subtitle: 'Noe fungerer ikke', Icon: Bug };
    if (t === 'wish') return { title: '💡 Ønske', subtitle: 'Forslag til ny funksjon', Icon: Lightbulb };
    return { title: '⭐ Tilbakemelding', subtitle: 'Noe som er bra eller dårlig', Icon: Star };
  };

  const submit = async () => {
    if (!type) return;
    if (!title.trim()) {
      alert('Skriv en kort tittel.');
      return;
    }
    if (!description.trim()) {
      alert('Skriv en kort beskrivelse.');
      return;
    }
    if (!navigator.onLine) {
      alert('Du er offline. Slå på nett og prøv igjen.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user || null;
      if (!u) throw new Error('Ikke logget inn');

      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i];
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 6) || 'jpg';
        const path = `feedback/${u.id}/${Date.now()}_${i}.${safeExt}`;
        const { error: uploadError } = await supabase.storage.from('hive-images').upload(path, f);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('hive-images').getPublicUrl(path);
        if (data?.publicUrl) uploadedUrls.push(data.publicUrl);
      }

      const payload = {
        user_id: u.id,
        user_name: userName || u.email || u.id.slice(0, 8),
        type,
        title: title.trim(),
        description: description.trim(),
        image_urls: uploadedUrls,
        auto_screenshot_url: null,
        app_version: appVersion || null,
        device_info: deviceInfo,
        route: sourceRoute || null,
        status: 'NY',
        priority: type === 'bug' ? 'NORMAL' : 'LAV',
      };

      const { error } = await supabase.from('feedback_reports').insert(payload as any);
      if (error) throw error;

      try {
        confetti({ particleCount: 70, spread: 55, origin: { y: 0.7 } });
      } catch {}

      setStep('done');
    } catch (e: any) {
      alert(e?.message || 'Kunne ikke sende. Prøv igjen.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-gray-700 font-bold">
            <Loader2 className="w-5 h-5 animate-spin" />
            Laster...
          </div>
        </div>
      </div>
    );
  }

  const selected = type ? typeCard(type) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-700"
            aria-label="Tilbake"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <div className="font-black text-gray-900">💬 Tilbakemelding</div>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {step !== 'done' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="font-black text-gray-900 text-lg">💬 Tilbakemelding</div>
            <div className="text-sm text-gray-600 mt-1">Har du funnet en feil eller har et ønske?</div>
          </div>
        )}

        {step === 'choose' && (
          <div className="space-y-3">
            {(['bug', 'wish', 'feedback'] as FeedbackType[]).map((t) => {
              const card = typeCard(t);
              const Icon = card.Icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setStep('form');
                  }}
                  className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-gray-900">{card.title}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{card.subtitle}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 'form' && selected && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-gray-900">{selected.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Bruker: {userName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setType(null);
                    setStep('choose');
                    setTitle('');
                    setDescription('');
                    setFiles([]);
                  }}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800"
                >
                  Endre type
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase">Tittel</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="QR scanner virker ikke"
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-gray-500 uppercase">Beskrivelse</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beskriv problemet eller ønsket med egne ord"
                  rows={6}
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-gray-500 uppercase">Legg ved bilde</div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={pickImages}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Kamera / bilde
                  </button>
                  <button
                    type="button"
                    onClick={pickImages}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-black px-4 py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-5 h-5" />
                    Velg
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onFilesPicked(e.target.files)}
                />

                {previews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {previews.map((p, idx) => (
                      <div key={`${p.file.name}:${p.file.size}:${idx}`} className="relative">
                        <img src={p.url} alt="" className="w-full h-24 object-cover rounded-xl border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removeFileAt(idx)}
                          className="absolute top-1 right-1 bg-white/90 border border-gray-200 rounded-full p-1 text-red-600"
                          aria-label="Fjern"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="w-full bg-gray-900 hover:bg-black text-white font-black px-4 py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Send inn
            </button>

            <div className="text-[11px] text-gray-500 px-1">
              Vi sender automatisk med teknisk info (tid, side, enhet, nettleser) slik at vi kan fikse fortere.
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
            <div className="text-3xl font-black text-green-600">✅</div>
            <div className="mt-2 font-black text-gray-900 text-lg">Takk for tilbakemeldingen!</div>
            <div className="text-sm text-gray-600 mt-1">Dette hjelper oss å forbedre LEK.</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('choose');
                  setType(null);
                  setTitle('');
                  setDescription('');
                  setFiles([]);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-3 rounded-xl"
              >
                Send en til
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-black px-4 py-3 rounded-xl"
              >
                Tilbake
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


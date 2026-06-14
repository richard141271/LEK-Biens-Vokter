'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, FileText, Loader2, Upload } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function NySigneringPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
  });

  const pickFile = (nextFile: File | null) => {
    if (!nextFile) return;
    if (nextFile.type !== 'application/pdf' && !nextFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Kun PDF-filer støttes i MVP.');
      return;
    }
    setError(null);
    setFile(nextFile);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/signering/ny');
        return;
      }
      setCheckingAuth(false);
    };
    void checkAuth();
  }, [router, supabase]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Du må laste opp en PDF først.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/signering/ny');
        return;
      }

      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const pdfPath = `${user.id}/signing/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('sign-documents').upload(pdfPath, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message || 'Kunne ikke laste opp PDF');
      }

      const res = await fetch('/api/signing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          pdfPath,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke opprette signering');
      }

      router.push(`/signering/${data.request.id}`);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke opprette signering');
    } finally {
      setSaving(false);
    }
  };

  if (checkingAuth) {
    return <div className="p-8 text-center text-gray-500">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/signering')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900">Ny signering</h1>
            <p className="text-xs text-gray-500">Last opp PDF og opprett en enkel signeringslenke.</p>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-4">
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Tittel</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm"
              placeholder="F.eks. Studentavtale sommer 2026"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Beskrivelse</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm min-h-[120px]"
                placeholder="Kort forklaring på hva dokumentet gjelder"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Mottaker navn</label>
              <input
                value={form.recipientName}
                onChange={(e) => setForm((prev) => ({ ...prev, recipientName: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">E-post</label>
              <input
                type="email"
                value={form.recipientEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, recipientEmail: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Telefon</label>
            <input
              value={form.recipientPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, recipientPhone: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm"
              placeholder="Forberedt for SMS senere"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Last opp PDF</label>
            <label
              className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-gray-500 bg-gray-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const dropped = e.dataTransfer?.files?.[0] || null;
                pickFile(dropped);
              }}
            >
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
              <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-3">
                <Upload className="w-5 h-5 text-gray-500" />
              </div>
              <div className="font-bold text-gray-900">{isDragging ? 'Slipp PDF her' : 'Klikk eller dra inn PDF'}</div>
              <div className="text-sm text-gray-500 mt-1">Kun PDF-filer støttes i MVP.</div>
              {file && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700">
                  <FileText className="w-4 h-4" />
                  {file.name}
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href="/signering"
              className="flex-1 text-center bg-white border border-gray-300 text-gray-800 font-black py-3 rounded-xl hover:bg-gray-50"
            >
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gray-900 text-white font-black py-3 rounded-xl hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Opprett signering
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

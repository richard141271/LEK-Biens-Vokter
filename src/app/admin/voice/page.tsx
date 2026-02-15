'use client';

import { useEffect, useMemo, useState } from 'react';

type Failure = {
  id: string;
  recognized_text: string;
  matched_phrase: string | null;
  expected_parse: any | null;
  created_at: string;
  source: string | null;
};

const CATEGORIES = ['STATUS', 'YNGEL', 'DRONNING', 'HONNING', 'EGG', 'SYKDOM', 'TEMPERATUR', 'VÆR'];

export default function VoiceAdminPage() {
  const [failures, setFailures] = useState<Failure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alias, setAlias] = useState('');
  const [correct, setCorrect] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [approve, setApprove] = useState(true);
  const [personalAlias, setPersonalAlias] = useState({ alias: '', phrase: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ok = true;
    fetch('/api/admin/voice/failures').then(async (r) => {
      if (!ok) return;
      if (r.status === 401 || r.status === 403) {
        setError('Ingen tilgang');
        setLoading(false);
        return;
      }
      const j = await r.json();
      setFailures(j.items || []);
      setLoading(false);
    }).catch(() => {
      if (!ok) return;
      setError('Kunne ikke laste');
      setLoading(false);
    });
    return () => { ok = false; };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, { key: string; count: number; samples: Failure[]; matched: string | null }> = {};
    for (const f of failures) {
      const key = (f.recognized_text || '').toLowerCase();
      if (!map[key]) map[key] = { key, count: 0, samples: [], matched: f.matched_phrase || null };
      map[key].count += 1;
      if (map[key].samples.length < 3) map[key].samples.push(f);
      if (!map[key].matched && f.matched_phrase) map[key].matched = f.matched_phrase;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [failures]);

  const pick = (g: { key: string; matched: string | null }) => {
    setAlias(g.key);
    setCorrect(g.matched || '');
  };

  const submitAlias = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/voice/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, correct_phrase: correct, category, approve })
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || 'Feil ved lagring');
      }
      setAlias('');
      setCorrect('');
    } catch (e: any) {
      setError(e.message || 'Ukjent feil');
    } finally {
      setSaving(false);
    }
  };

  const submitPersonal = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/voice/aliases/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: personalAlias.alias, phrase: personalAlias.phrase })
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || 'Feil ved lagring');
      }
      setPersonalAlias({ alias: '', phrase: '' });
    } catch (e: any) {
      setError(e.message || 'Ukjent feil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Tale • Fellesbank Moderering</h1>
      {loading && <div>Laster…</div>}
      {!!error && <div className="text-red-600 mb-4">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-4">
            <div className="font-medium mb-3">Nye feil (siste 200)</div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {grouped.map(g => (
                <div key={g.key} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{g.key}</div>
                    <div className="text-xs text-gray-500">Treff: {g.count}{g.matched ? ` • Nær: ${g.matched}` : ''}</div>
                  </div>
                  <button onClick={() => pick(g)} className="text-sm px-3 py-1.5 rounded bg-honey-500 text-white">Foreslå alias</button>
                </div>
              ))}
              {grouped.length === 0 && <div className="text-sm text-gray-500">Ingen feil registrert.</div>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border rounded-xl p-4">
              <div className="font-medium mb-3">Opprett globalt alias</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Feil tekst</label>
                  <input value={alias} onChange={e => setAlias(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="f.eks. overskya" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Riktig frase</label>
                  <input value={correct} onChange={e => setCorrect(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="f.eks. overskyet" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Kategori</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded px-3 py-2">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={approve} onChange={e => setApprove(e.target.checked)} />
                  <span className="text-sm">Godkjenn nå</span>
                </label>
                <div className="flex gap-2">
                  <button disabled={saving} onClick={submitAlias} className="px-4 py-2 rounded bg-green-600 text-white">Lagre</button>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <div className="font-medium mb-3">Legg til personlig alias</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Feil tekst</label>
                  <input value={personalAlias.alias} onChange={e => setPersonalAlias(a => ({ ...a, alias: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="f.eks. bra inger" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Riktig frase</label>
                  <input value={personalAlias.phrase} onChange={e => setPersonalAlias(a => ({ ...a, phrase: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="f.eks. bra yngel" />
                </div>
                <div className="flex gap-2">
                  <button disabled={saving} onClick={submitPersonal} className="px-4 py-2 rounded bg-honey-500 text-white">Lagre personlig</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type AliasRow = {
  alias_norm: string;
  intent: any;
};

const STORAGE_KEY = 'lek_voice2_aliases_v1';

const normalize = (t: string) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

let cache: Map<string, any> | null = null;
let inFlight: Promise<void> | null = null;

function ensureFromStorage() {
  if (cache) return;
  cache = new Map<string, any>();
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const items: AliasRow[] = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
    for (const r of items) {
      const k = normalize(r?.alias_norm || '');
      if (!k) continue;
      cache.set(k, r?.intent || null);
    }
  } catch {}
}

export function getVoice2AliasIntent(text: string): any | null {
  ensureFromStorage();
  const k = normalize(text);
  if (!k || !cache) return null;
  return cache.get(k) || null;
}

export async function loadVoice2Aliases(): Promise<void> {
  ensureFromStorage();
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch('/api/voice2/aliases', { method: 'GET' });
      if (!res.ok) return;
      const j = await res.json().catch(() => null);
      const items: AliasRow[] = Array.isArray(j?.items) ? j.items : [];
      cache = new Map<string, any>();
      for (const r of items) {
        const k = normalize(r?.alias_norm || '');
        if (!k) continue;
        cache.set(k, r?.intent || null);
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
      } catch {}
    } catch {}
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function submitVoice2Alias(aliasText: string, expectedIntent: any): Promise<void> {
  try {
    const alias = String(aliasText || '').trim();
    if (!alias) return;
    if (!expectedIntent || typeof expectedIntent !== 'object') return;
    await fetch('/api/voice2/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aliasText: alias, expectedIntent }),
    }).catch(() => {});
  } catch {}
}


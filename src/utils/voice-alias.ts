export type AliasMap = Record<string, string>;

const KEY = 'voice_alias_map';
const TTL_MS = 1000 * 60 * 30;

export async function loadAliases(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj?.ts && now - obj.ts < TTL_MS) return;
    }
    const res = await fetch('/api/voice/aliases', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const approved: AliasMap = {};
    const personal: AliasMap = {};
    (data.approved || []).forEach((r: any) => {
      if (r.alias && r.phrase) approved[r.alias.toLowerCase()] = r.phrase.toLowerCase();
    });
    (data.personal || []).forEach((r: any) => {
      if (r.alias && r.phrase) personal[r.alias.toLowerCase()] = r.phrase.toLowerCase();
    });
    localStorage.setItem(KEY, JSON.stringify({ ts: now, approved, personal }));
  } catch {}
}

export function getAliasMap(): AliasMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    const personal = obj?.personal || {};
    const approved = obj?.approved || {};
    return { ...approved, ...personal, ...personal };
  } catch {
    return {};
  }
}

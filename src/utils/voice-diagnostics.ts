'use client';

type Parsed = {
  queenSeen?: boolean;
  eggsSeen?: boolean;
  honeyStores?: 'lite' | 'middels' | 'mye';
  temperament?: 'rolig' | 'urolig' | 'aggressiv';
  broodCondition?: 'darlig' | 'normal' | 'bra';
  status?: string;
  temperature?: string;
  weather?: string;
  action?: 'TAKE_PHOTO' | 'SAVE_INSPECTION';
};

type Phrase = {
  group: string;
  text: string;
  expected: Parsed;
};

const catalog: Phrase[] = [
  { group: 'Handling', text: 'Ta bilde', expected: { action: 'TAKE_PHOTO' } },
  { group: 'Handling', text: 'Lagre inspeksjon', expected: { action: 'SAVE_INSPECTION' } },
  { group: 'Dronning', text: 'Dronning sett', expected: { queenSeen: true } },
  { group: 'Dronning', text: 'Ingen dronning', expected: { queenSeen: false } },
  { group: 'Egg', text: 'Egg sett', expected: { eggsSeen: true } },
  { group: 'Egg', text: 'Ingen egg', expected: { eggsSeen: false } },
  { group: 'Honning', text: 'Lite honning', expected: { honeyStores: 'lite' } },
  { group: 'Honning', text: 'Middels honning', expected: { honeyStores: 'middels' } },
  { group: 'Honning', text: 'Mye honning', expected: { honeyStores: 'mye' } },
  { group: 'Gemytt', text: 'Rolig', expected: { temperament: 'rolig' } },
  { group: 'Gemytt', text: 'Urolig', expected: { temperament: 'urolig' } },
  { group: 'Gemytt', text: 'Aggressiv', expected: { temperament: 'aggressiv' } },
  { group: 'Yngel', text: 'Bra yngel', expected: { broodCondition: 'bra' } },
  { group: 'Yngel', text: 'Normal yngel', expected: { broodCondition: 'normal' } },
  { group: 'Yngel', text: 'Dårlig yngel', expected: { broodCondition: 'darlig' } },
  { group: 'Status', text: 'Alt bra', expected: { status: 'OK' } },
  { group: 'Status', text: 'Svak', expected: { status: 'SVAK' } },
  { group: 'Status', text: 'Død', expected: { status: 'DØD' } },
  { group: 'Status', text: 'Sykdom', expected: { status: 'SYKDOM' } },
  { group: 'Status', text: 'Bytt dronning', expected: { status: 'BYTT_DRONNING' } },
  { group: 'Status', text: 'Mottatt fôr', expected: { status: 'MOTTATT_FOR' } },
  { group: 'Status', text: 'Skiftet rammer', expected: { status: 'SKIFTET_RAMMER' } },
  { group: 'Status', text: 'Sverming', expected: { status: 'SVERMING' } },
  { group: 'Status', text: 'Varroa mistanke', expected: { status: 'VARROA_MISTANKE' } },
  { group: 'Status', text: 'Byttet voks', expected: { status: 'BYTTET_VOKS' } },
  { group: 'Vær', text: 'Sol', expected: { weather: 'Klart' } },
  { group: 'Vær', text: 'Regn', expected: { weather: 'Regn' } },
  { group: 'Vær', text: 'Overskyet', expected: { weather: 'Lettskyet/Overskyet' } },
  { group: 'Temperatur', text: '20 grader', expected: { temperature: '20' } }
];

export function getCatalog(): Phrase[] {
  return catalog;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string) {
  const aa = norm(a);
  const bb = norm(b);
  const d = levenshtein(aa, bb);
  const maxLen = Math.max(aa.length, bb.length) || 1;
  return 1 - d / maxLen;
}

function isEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('voice_autocorrect') === '1';
  } catch {
    return false;
  }
}

function pushFailure(entry: any) {
  if (typeof window === 'undefined') return;
  try {
    const key = 'voice_failures';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.unshift(entry);
    localStorage.setItem(key, JSON.stringify(arr.slice(0, 500)));
  } catch {}
}

export function analyzeAndCorrect(recognized: string, parsed: Parsed): { parsed: Parsed, corrected: boolean, matched?: string, similarity: number } {
  const text = recognized || '';
  const best = getCatalog()
    .map(p => ({ ...p, score: similarity(text, p.text) }))
    .sort((a, b) => b.score - a.score)[0];

  const thresh = 0.7;
  let corrected = parsed;
  const before = JSON.stringify(parsed);
  const exp = best?.expected || {};

  let inconsistent = false;
  for (const k of Object.keys(exp)) {
    const ev: any = (exp as any)[k];
    const pv: any = (parsed as any)?.[k];
    if (k === 'temperature') {
      const pvStr = typeof pv === 'string' ? pv : pv != null ? String(pv) : '';
      if (!pvStr.startsWith(String(ev))) inconsistent = true;
    } else {
      if (pv !== ev) inconsistent = true;
    }
  }

  if (best && best.score >= thresh && inconsistent && isEnabled()) {
    corrected = { ...parsed, ...exp };
  }

  if (best && (inconsistent || !parsed || Object.keys(parsed).length === 0)) {
    const after = JSON.stringify(corrected);
    if (before !== after) {
      pushFailure({
        timestamp: new Date().toISOString(),
        recognized_text: text,
        matched_phrase: best.text,
        similarity: Number(best.score.toFixed(3)),
        expected_parse: exp,
        parsed_before: JSON.parse(before),
        parsed_after: JSON.parse(after)
      });
    }
  }

  return {
    parsed: corrected,
    corrected: JSON.stringify(corrected) !== before,
    matched: best?.text,
    similarity: best?.score || 0
  };
}

export function setAutoCorrectEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('voice_autocorrect', enabled ? '1' : '0');
  } catch {}
}

export function getAutoCorrectEnabled(): boolean {
  return isEnabled();
}

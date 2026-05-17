import type { Voice2Intent } from '@/voice2/types';

const normalize = (t: string) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasAny = (t: string, words: string[]) => words.some((w) => t.includes(w));

const pickAmount = (t: string): 'lite' | 'normal' | 'mye' | null => {
  if (/\b(lite)\b/.test(t)) return 'lite';
  if (/\b(mye)\b/.test(t)) return 'mye';
  if (/\b(normal)\b/.test(t)) return 'normal';
  return null;
};

export function parseVoice2Intent(text: string): Voice2Intent {
  const t = normalize(text);
  if (!t) return { type: 'UNKNOWN' };

  if (/\b(lagre|lagre inspeksjon|save)\b/.test(t)) return { type: 'SAVE_INSPECTION' };

  if (/\b(ta bilde|knips|foto|bilde)\b/.test(t)) return { type: 'TAKE_PHOTO' };

  if (/\b(dronning)\b/.test(t) && /\b(ikke|ingen)\b/.test(t) && /\b(sett|funnet)\b/.test(t)) {
    return { type: 'QUEEN_NOT_SEEN' };
  }
  if (/\b(dronning)\b/.test(t) && /\b(sett|funnet|har sett|observert)\b/.test(t)) {
    return { type: 'QUEEN_SEEN' };
  }

  if (/\b(dronningfarge|farge)\b/.test(t) || (/\b(dronning)\b/.test(t) && /\b(farge)\b/.test(t))) {
    if (/\b(hvit)\b/.test(t)) return { type: 'QUEEN_COLOR', color: 'hvit' };
    if (/\b(gul)\b/.test(t)) return { type: 'QUEEN_COLOR', color: 'gul' };
    if (/\b(rod|rød)\b/.test(t)) return { type: 'QUEEN_COLOR', color: 'rod' };
    if (/\b(gronn|grønn)\b/.test(t)) return { type: 'QUEEN_COLOR', color: 'gronn' };
    if (/\b(bla|blå)\b/.test(t)) return { type: 'QUEEN_COLOR', color: 'bla' };
  }

  if (/\b(egg)\b/.test(t) && /\b(ikke|ingen)\b/.test(t) && /\b(sett|funnet)\b/.test(t)) return { type: 'EGGS_NOT_SEEN' };
  if (/\b(egg)\b/.test(t) && /\b(sett|funnet|har sett)\b/.test(t)) return { type: 'EGGS_SEEN' };

  const amount = pickAmount(t);
  if (amount) {
    if (/\b(egg)\b/.test(t) && !/\b(egg sett|ingen egg)\b/.test(t)) return { type: 'BROOD_EGG', amount };
    if (/\b(larve|larver)\b/.test(t)) return { type: 'BROOD_LARVAE', amount };
    if (/\b(yngel)\b/.test(t)) return { type: 'BROOD_YNGEL', amount };
    if (/\b(drone|droner)\b/.test(t)) return { type: 'BROOD_DRONES', amount };
  }

  if (/\b(honning)\b/.test(t)) {
    if (/\b(lite)\b/.test(t)) return { type: 'HONEY_STORES', level: 'lite' };
    if (/\b(middels)\b/.test(t)) return { type: 'HONEY_STORES', level: 'middels' };
    if (/\b(mye)\b/.test(t)) return { type: 'HONEY_STORES', level: 'mye' };
  }

  if (/\b(gemytt|temperament)\b/.test(t)) {
    if (/\b(rolig)\b/.test(t)) return { type: 'TEMPERAMENT', temperament: 'rolig' };
    if (/\b(urolig)\b/.test(t)) return { type: 'TEMPERAMENT', temperament: 'urolig' };
    if (/\b(aggressiv)\b/.test(t)) return { type: 'TEMPERAMENT', temperament: 'aggressiv' };
  }
  if (t === 'rolig' || t === 'urolig' || t === 'aggressiv') {
    return { type: 'TEMPERAMENT', temperament: t as any };
  }

  const knownStatus = [
    'ok',
    'sterk',
    'svak',
    'byttet voks',
    'mottatt for',
    'skiftet rammer',
    'sverming',
    'bytt dronning',
    'varroa mistanke',
    'sykdom',
    'dod',
  ];
  const mapStatus = (k: string) => {
    if (k === 'mottatt for') return 'Mottatt fôr';
    if (k === 'dod') return 'Død';
    if (k === 'bytt dronning') return 'Bytt Dronning';
    if (k === 'byttet voks') return 'Byttet voks';
    if (k === 'skiftet rammer') return 'Skiftet rammer';
    if (k === 'varroa mistanke') return 'Varroa mistanke';
    if (k === 'sykdom') return 'Sykdom';
    if (k === 'sterk') return 'Sterk';
    if (k === 'svak') return 'Svak';
    if (k === 'sverming') return 'Sverming';
    return 'OK';
  };
  if (/\b(status)\b/.test(t)) {
    for (const k of knownStatus) {
      if (t.includes(k)) return { type: 'STATUS', status: mapStatus(k) };
    }
    if (/\b(ok)\b/.test(t)) return { type: 'STATUS', status: 'OK' };
  }
  for (const k of knownStatus) {
    if (t === k || t.startsWith(`${k} `) || t.includes(` ${k} `) || t.endsWith(` ${k}`)) {
      return { type: 'STATUS', status: mapStatus(k) };
    }
  }

  if (/\b(lite)\b/.test(t) && hasAny(t, ['for', 'fôr', 'mat'])) return { type: 'FEED_LOW' };

  if (hasAny(t, ['ga', 'gitt', 'gir', 'gjev', 'gav']) && hasAny(t, ['sukkerlake', 'sukkervann', 'sukker vann'])) {
    return { type: 'FEED_GIVEN', feedType: 'sukkerlake' };
  }
  if (hasAny(t, ['ga', 'gitt', 'gir', 'gjev', 'gav']) && hasAny(t, ['nodfor', 'nødfor', 'nodfôr', 'nødfôr'])) {
    return { type: 'FEED_GIVEN', feedType: 'nodfor' };
  }
  if (hasAny(t, ['ga', 'gitt', 'gir', 'gjev', 'gav']) && hasAny(t, ['for', 'fôr'])) {
    return { type: 'FEED_GIVEN', feedType: 'annet' };
  }

  if (hasAny(t, ['varroa', 'varoa', 'varro', 'midd', 'mider'])) {
    if (hasAny(t, ['ingen', 'ikke', 'null', '0'])) return { type: 'VARROA_NONE' };
    if (hasAny(t, ['mistanke'])) return { type: 'VARROA_SUSPECT' };
    if (hasAny(t, ['behandlet', 'behandling', 'behandla'])) return { type: 'VARROA_TREATED' };
  }

  return { type: 'UNKNOWN' };
}

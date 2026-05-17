import type { Voice2Intent } from '@/voice2/types';

const normalize = (t: string) =>
  String(t || '')
    .toLowerCase()
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function parseVoice2Intent(text: string): Voice2Intent {
  const t = normalize(text);
  if (!t) return { type: 'UNKNOWN' };

  if (/\b(lagre|lagre inspeksjon|save)\b/.test(t)) return { type: 'SAVE_INSPECTION' };

  if (/\b(dronning)\b/.test(t) && /\b(sett|funnet|har sett|observert)\b/.test(t)) {
    return { type: 'QUEEN_SEEN' };
  }

  if (/\b(lite)\b/.test(t) && /\b(fôr|for)\b/.test(t)) return { type: 'FEED_LOW' };

  if (/\b(ga|gitt|gir|gitt)\b/.test(t) && /\b(sukkerlake)\b/.test(t)) {
    return { type: 'FEED_GIVEN', feedType: 'sukkerlake' };
  }
  if (/\b(ga|gitt|gir|gitt)\b/.test(t) && /\b(nødfôr|nodfor)\b/.test(t)) {
    return { type: 'FEED_GIVEN', feedType: 'nodfor' };
  }
  if (/\b(ga|gitt|gir|gitt)\b/.test(t) && /\b(fôr|for)\b/.test(t)) {
    return { type: 'FEED_GIVEN', feedType: 'annet' };
  }

  if (/\b(ingen|null|0)\b/.test(t) && /\b(varroa)\b/.test(t)) return { type: 'VARROA_NONE' };

  return { type: 'UNKNOWN' };
}


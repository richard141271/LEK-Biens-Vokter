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

  if (/\b(bekreft|bekreftet)\b/.test(t)) return { type: 'CONFIRM' };
  if (/\b(avbryt|kanseller|stopp|avvis)\b/.test(t)) return { type: 'CANCEL' };
  if (/\b(angre siste|avbryt siste|undo|angre)\b/.test(t)) return { type: 'UNDO_LAST' };

  if (/\b(notat slutt|notater slutt|avslutt notat|stopp notat|notat avslutt)\b/.test(t)) return { type: 'NOTES_STOP' };
  if (t === 'notat' || t === 'notater' || t.startsWith('notat ') || t.startsWith('notater ')) return { type: 'NOTES_START' };

  if (/\bvis flere handlinger\b/.test(t)) return { type: 'SHOW_MORE_ACTIONS' };
  if (/\bskjul flere handlinger\b/.test(t)) return { type: 'HIDE_MORE_ACTIONS' };
  if (/\b(nullstill handlinger|nullstill utf[oø]rt|nullstill)\b/.test(t)) return { type: 'RESET_ACTIONS' };

  if (/\b(neste bikube|neste kube|neste)\b/.test(t) && /\b(bikube|kube)\b/.test(t)) return { type: 'NEXT_HIVE' };
  if (/\b(forrige bikube|forrige bikube|forrige kube|tilbake bikube)\b/.test(t)) return { type: 'PREV_HIVE' };

  if (/\b(lagre|lagre inspeksjon|save)\b/.test(t)) return { type: 'SAVE_INSPECTION' };

  if (/\b(ta bilde|knips|foto|bilde)\b/.test(t)) return { type: 'TAKE_PHOTO' };

  const tempMatch =
    t.match(/\b(temperatur)\s*(-?\d{1,2})\b/) ||
    t.match(/\b(-?\d{1,2})\s*(grader|grad)\b/) ||
    t.match(/\b(-?\d{1,2})\s*c\b/);
  if (tempMatch) {
    const raw = Number(tempMatch[2] ?? tempMatch[1]);
    if (Number.isFinite(raw)) {
      const celsius = Math.max(-30, Math.min(60, Math.round(raw)));
      return { type: 'TEMPERATURE', celsius };
    }
  }

  if (t.startsWith('vaer ') || t.startsWith('vær ') || /\b(vaer|vær)\b/.test(t)) {
    const weatherText = t.replace(/\b(vaer|vær)\b/g, '').trim();
    const w = weatherText || t;
    if (hasAny(w, ['sol', 'sola', 'solen', 'klart', 'klarvaer', 'klarvær'])) return { type: 'WEATHER', weather: 'Sol' };
    if (hasAny(w, ['delvis', 'lettskyet', 'lett skyet', 'delvis skyet'])) return { type: 'WEATHER', weather: 'Delvis skyet' };
    if (hasAny(w, ['skyet', 'overskyet', 'skyer', 'gratt', 'grått'])) return { type: 'WEATHER', weather: 'Overskyet' };
    if (hasAny(w, ['regn', 'regner', 'yr', 'dusj', 'byger'])) return { type: 'WEATHER', weather: 'Regn' };
    if (hasAny(w, ['vind', 'blaser', 'blåser', 'kuling'])) return { type: 'WEATHER', weather: 'Vind' };
    if (hasAny(w, ['toke', 'tåke', 'dis'])) return { type: 'WEATHER', weather: 'Tåke' };
    if (hasAny(w, ['sno', 'snø', 'sludd'])) return { type: 'WEATHER', weather: 'Snø' };
    if (weatherText) return { type: 'WEATHER', weather: weatherText };
  }

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

  if (hasAny(t, ['gitt for', 'gitt fôr', 'ga for', 'ga fôr', 'fôret', 'foret', 'foring', 'fôring', 'matet', 'mating'])) {
    if (hasAny(t, ['sukkerlake', 'sukkervann', 'sukker vann'])) return { type: 'FEED_GIVEN', feedType: 'sukkerlake' };
    if (hasAny(t, ['nodfor', 'nødfor', 'nodfôr', 'nødfôr'])) return { type: 'FEED_GIVEN', feedType: 'nodfor' };
    return { type: 'FEED_GIVEN', feedType: 'annet' };
  }

  if (hasAny(t, ['behandlet varroa', 'varroa behandlet', 'varroabehandling', 'varroa behandling', 'behandla varroa'])) {
    return { type: 'PERFORMED_ACTION', id: 'VARROA_TREATED' };
  }
  if (hasAny(t, ['satt pa skattekasse', 'satt på skattekasse', 'skattekasse pa', 'skattekasse på', 'la pa skattekasse', 'la på skattekasse'])) {
    return { type: 'PERFORMED_ACTION', id: 'SUPER_ADDED' };
  }
  if (hasAny(t, ['fjernet skattekasse', 'tok av skattekasse', 'tatt av skattekasse', 'skattekasse av'])) {
    return { type: 'PERFORMED_ACTION', id: 'SUPER_REMOVED' };
  }
  if (hasAny(t, ['hostet honning', 'høstet honning', 'honning hostet', 'honning høstet', 'slynget', 'honning slynget'])) {
    return { type: 'PERFORMED_ACTION', id: 'HONEY_HARVESTED' };
  }
  if (hasAny(t, ['byttet dronning', 'bytta dronning', 'skiftet dronning'])) {
    return { type: 'PERFORMED_ACTION', id: 'QUEEN_REPLACED' };
  }
  if (hasAny(t, ['fjernet dronningceller', 'fjerna dronningceller', 'dronningceller fjernet', 'dronningceller fjerna'])) {
    return { type: 'PERFORMED_ACTION', id: 'QUEEN_CELLS_REMOVED' };
  }
  if (hasAny(t, ['satt inn rammer', 'satt inn ramme', 'satt i rammer', 'rammer satt inn', 'rammer inn'])) {
    return { type: 'PERFORMED_ACTION', id: 'FRAMES_ADDED' };
  }
  if (hasAny(t, ['fjernet rammer', 'fjernet ramme', 'tatt ut rammer', 'tok ut rammer', 'rammer ut'])) {
    return { type: 'PERFORMED_ACTION', id: 'FRAMES_REMOVED' };
  }
  if (hasAny(t, ['byttet voks', 'bytta voks', 'skiftet voks', 'ny voks', 'byttet ut voks'])) {
    return { type: 'PERFORMED_ACTION', id: 'WAX_REPLACED' };
  }
  if (hasAny(t, ['laget avlegger', 'avlegger laget', 'lagde avlegger', 'avlegger'])) {
    return { type: 'PERFORMED_ACTION', id: 'SPLIT_MADE' };
  }
  if (hasAny(t, ['delt kube', 'delte kube', 'kube delt', 'splittet kube', 'splitte kube'])) {
    return { type: 'PERFORMED_ACTION', id: 'HIVE_SPLIT' };
  }
  if (hasAny(t, ['varroatest', 'varroa test', 'gjennomfort varroatest', 'gjennomført varroatest', 'gjort varroatest'])) {
    return { type: 'PERFORMED_ACTION', id: 'VARROA_TEST_DONE' };
  }

  if (hasAny(t, ['varroa', 'varoa', 'varro', 'midd', 'mider'])) {
    if (hasAny(t, ['ingen', 'ikke', 'null', '0'])) return { type: 'VARROA_NONE' };
    if (hasAny(t, ['mistanke'])) return { type: 'VARROA_SUSPECT' };
    if (hasAny(t, ['behandlet', 'behandling', 'behandla'])) return { type: 'VARROA_TREATED' };
  }

  return { type: 'UNKNOWN' };
}

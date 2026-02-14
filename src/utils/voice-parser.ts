import { getAliasMap } from './voice-alias';

export interface ParsedInspection {
    queenSeen?: boolean;
    eggsSeen?: boolean;
    honeyStores?: 'lite' | 'middels' | 'mye';
    temperament?: 'rolig' | 'urolig' | 'aggressiv';
    broodCondition?: 'darlig' | 'normal' | 'bra';
    status?: string;
    temperature?: string;
    weather?: string;
    action?: 'TAKE_PHOTO' | 'SAVE_INSPECTION';
}

export function parseVoiceCommand(text: string): ParsedInspection {
    const t0 = (text || '').toLowerCase();
    const t1 = applyAliases(t0);
    const t = t1;
    const result: ParsedInspection = {};

    const has = (patterns: string[]) => patterns.some(p => t.includes(p));
    const hasWord = (w: string) => new RegExp(`\\b${w}\\b`).test(t);

    const cmd = parseStructured(t);
    if (cmd.status) result.status = cmd.status;
    if (cmd.broodCondition) result.broodCondition = cmd.broodCondition as any;
    if (cmd.honeyStores) result.honeyStores = cmd.honeyStores as any;
    if (cmd.temperament) result.temperament = cmd.temperament as any;
    if (cmd.eggsSeen !== undefined) result.eggsSeen = cmd.eggsSeen;
    if (cmd.queenSeen !== undefined) result.queenSeen = cmd.queenSeen;
    if (cmd.temperature) result.temperature = cmd.temperature;
    if (cmd.weather) result.weather = cmd.weather;
    if (result.status || result.broodCondition || result.honeyStores || result.temperament || result.eggsSeen !== undefined || result.queenSeen !== undefined) {
        return result;
    }

    // --- Action: Save Inspection ---
    if (has(['lagre inspeksjon', 'lagre skjema', 'ferdig med inspeksjon', 'send inn', 'lagre nå', 'avslutt inspeksjon'])) {
        result.action = 'SAVE_INSPECTION';
    }

    // --- Action: Take Photo ---
    if (has(['ta bilde', 'ta foto', 'knips', 'bilde'])) {
        result.action = 'TAKE_PHOTO';
    }

    // --- Queen ---
    if (has(['ingen dronning', 'ikke sett dronning', 'finner ikke dronning', 'mangler dronning', 'ser ikke dronning', 'hvor er hun', 'ingen dronning å se'])) {
        result.queenSeen = false;
    } else if (has(['dronning sett', 'ser dronning', 'så dronning', 'dronninga er her', 'merket dronning', 'fant dronning', 'der er hun', 'hun er her', 'dronning observert'])) {
        result.queenSeen = true;
    }

    // --- Eggs ---
    if (has(['ingen egg', 'ikke sett egg', 'tom for egg', 'ingen stift', 'tomme celler', 'ser ingen egg', 'ingen yngelstift'])) {
        result.eggsSeen = false;
    } else if (has(['egg sett', 'ser egg', 'masse egg', 'dagsferske', 'så egg', 'fant egg', 'stifter', 'nylagt egg', 'ser stift', 'egg i cellene'])) {
        result.eggsSeen = true;
    }

    // --- Honey (Fôr) ---
    if (has(['lite honning', 'tomt for honning', 'sulten', 'lite mat', 'lite fôr', 'trenger fôr', 'tomme tavler', 'sultne bier'])) {
        result.honeyStores = 'lite';
    } else if (has(['middels honning', 'greit med honning', 'litt honning', 'ok med mat', 'middels fôr'])) {
        result.honeyStores = 'middels';
    } else if (has(['mye honning', 'fullt av honning', 'tunge rammer', 'masse mat', 'full skattekasse', 'mye fôr', 'tunge tavler', 'godt med mat'])) {
        result.honeyStores = 'mye';
    }

    // --- Temperament (Gemytt) ---
    // Viktig: sjekk 'urolig' før 'rolig' for å unngå at 'urolig' matcher 'rolig'
    if (has(['urolig', 'løper', 'stressede', 'nervøse', 'løper rundt'])) {
        result.temperament = 'urolig';
    } else if (has(['rolig', 'snille', 'greie bier', 'rolige bier', 'snille jenter', 'rolig på tavla'])) {
        result.temperament = 'rolig';
    } else if (has(['aggressiv', 'sint', 'stikker', 'vonde', 'angriper', 'stikker meg', 'angrep', 'vonde bier'])) {
        result.temperament = 'aggressiv';
    }

    // --- Brood (Yngelleie) ---
    if (has(['dårlig yngel', 'lite yngel', 'hullete yngel'])) {
        result.broodCondition = 'darlig';
    } else if (has(['bra yngel', 'tett yngel', 'fin yngel', 'masse yngel'])) {
        result.broodCondition = 'bra';
    } else if (has(['normal yngel', 'grei yngel'])) {
        result.broodCondition = 'normal';
    }

    // --- Status (Kubestatus) ---
    // Mappings: OK, SVAK, DØD, SYKDOM, BYTT_DRONNING, MOTTATT_FOR, SKIFTET_RAMMER, SVERMING, VARROA_MISTANKE, BYTTET_VOKS
    
    if (has(['svak', 'lite bier', 'stusselig'])) {
        result.status = 'SVAK';
    } else if (has(['død', 'tom kube', 'ingen bier'])) {
        result.status = 'DØD';
    } else if (has(['alt bra', 'fin kube', 'sterk', 'super', 'ok'])) {
        result.status = 'OK';
    } else if (has(['sykdom', 'syk'])) {
        result.status = 'SYKDOM';
    } else if (has(['bytt dronning', 'dronningbytte', 'ny dronning'])) {
        result.status = 'BYTT_DRONNING';
    } else if (has(['mottatt fôr', 'fôret', 'fikk mat', 'fikk fôr'])) {
        result.status = 'MOTTATT_FOR';
    } else if (has(['skiftet rammer', 'nye rammer', 'byttet rammer'])) {
        result.status = 'SKIFTET_RAMMER';
    } else if (has(['sverming', 'har svermet', 'sverm', 'svermetrang', 'fare for sverming', 'sverre trang', 'fare på svømming', 'fare for svømming'])) {
        result.status = 'SVERMING';
    } else if (hasWord('varroa') || (hasWord('midd') && !t.includes('middels'))) {
        // Varroa/Midd: unngå falsk treff på 'middels'
        result.status = 'VARROA_MISTANKE';
    } else if (has(['byttet voks', 'ny voks', 'smeltet voks'])) {
        result.status = 'BYTTET_VOKS';
    }

    // --- Temperature ---
    // Match "20 grader", "temperatur 20", "20.5 grader"
    const tempMatch = t.match(/(\d+([.,]\d+)?)\s*grader/) || t.match(/temperatur\s*(\d+([.,]\d+)?)/);
    if (tempMatch) {
        result.temperature = tempMatch[1].replace(',', '.');
    }

    // --- Weather ---
    if (has(['sol', 'klart', 'fint vær'])) {
        result.weather = 'Klart';
    } else if (has(['regn', 'regner', 'vått'])) {
        result.weather = 'Regn';
    } else if (has(['overskyet', 'skyet'])) {
        result.weather = 'Lettskyet/Overskyet';
    }

    return result;
}

function applyAliases(input: string): string {
    try {
        const map = getAliasMap();
        const aliases = Object.keys(map).sort((a, b) => b.length - a.length);
        let out = input;
        for (const a of aliases) {
            const p = map[a];
            if (!a || !p) continue;
            const re = new RegExp(`\\b${escapeReg(a)}\\b`, 'g');
            out = out.replace(re, p);
        }
        return out;
    } catch {
        return input;
    }
}

function escapeReg(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseStructured(t: string): any {
    const out: any = {};
    const kv = t.split(/[\n\r]+/).map(l => l.trim());
    const lines = kv.length > 1 ? kv : [t];
    const take = (key: string, value: string) => {
        const v = value.trim();
        if (!v) return;
        if (key === 'status') {
            if (/\bsvak\b/.test(v)) out.status = 'SVAK';
            else if (/\bdød\b/.test(v)) out.status = 'DØD';
            else if (/\bok\b|\balt bra\b|\bfin\b|\bsterk\b/.test(v)) out.status = 'OK';
            else if (/\bsykdom\b/.test(v)) out.status = 'SYKDOM';
            else if (/\bbytt\b.*\bdronning\b/.test(v)) out.status = 'BYTT_DRONNING';
            else if (/\bmottatt\b.*\bf[oø]r\b|\bf[oø]ret\b/.test(v)) out.status = 'MOTTATT_FOR';
            else if (/\bskiftet\b.*rammer\b|\bbyttet\b.*rammer\b/.test(v)) out.status = 'SKIFTET_RAMMER';
            else if (/\bsverming\b|\bsverm(et|ing)?\b/.test(v)) out.status = 'SVERMING';
            else if (/\bvarroa\b|\bmidd\b(?!els)/.test(v)) out.status = 'VARROA_MISTANKE';
            else if (/\bbyttet\b.*voks\b/.test(v)) out.status = 'BYTTET_VOKS';
        } else if (key === 'yngel') {
            if (/\bd[åa]rlig\b/.test(v)) out.broodCondition = 'darlig';
            else if (/\bbra\b|\btett\b|\bfin\b/.test(v)) out.broodCondition = 'bra';
            else if (/\bnormal\b|\bgrei\b/.test(v)) out.broodCondition = 'normal';
        } else if (key === 'honning') {
            if (/\blite\b|\btomt\b/.test(v)) out.honeyStores = 'lite';
            else if (/\bmiddels\b|\bgreit\b|\blitt\b/.test(v)) out.honeyStores = 'middels';
            else if (/\bmye\b|\bfullt\b/.test(v)) out.honeyStores = 'mye';
        } else if (key === 'gemytt' || key === 'temperament' || key === 'status gemytt') {
            if (/\burolig\b/.test(v)) out.temperament = 'urolig';
            else if (/\brolig\b|\bsnill(e)?\b/.test(v)) out.temperament = 'rolig';
            else if (/\baggressiv\b|\bsint\b/.test(v)) out.temperament = 'aggressiv';
        } else if (key === 'egg') {
            if (/\bingen\b|\bikke\b/.test(v)) out.eggsSeen = false;
            else if (/\bsett\b|\bser\b|\bmasse\b|\bs[oa]?\b/.test(v)) out.eggsSeen = true;
        } else if (key === 'dronning') {
            if (/\bingen\b|\bikke\b|\bmangler\b/.test(v)) out.queenSeen = false;
            else if (/\bsett\b|\bser\b|\bfant\b/.test(v)) out.queenSeen = true;
        } else if (key === 'temperatur') {
            const m = v.match(/(\d+([.,]\d+)?)/);
            if (m) out.temperature = m[1].replace(',', '.');
        } else if (key === 'vær' || key === 'vaer' || key === 'v\xe6r') {
            if (/\bsol\b|\bklart\b/.test(v)) out.weather = 'Klart';
            else if (/\bregn\b|\bregner\b|\bv[åa]tt\b/.test(v)) out.weather = 'Regn';
            else if (/\bskyet\b|\boverskyet\b/.test(v)) out.weather = 'Lettskyet/Overskyet';
        }
    };
    for (const line of lines) {
        const m = line.match(/\b(status|yngel|honning|gemytt|temperament|egg|dronning|temperatur|vær|vaer)\s*[:\-]\s*([^:;|]+)/);
        if (m) {
            take(m[1], m[2]);
        }
    }
    return out;
}

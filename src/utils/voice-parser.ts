import { getAliasMap } from './voice-alias';

export interface ParsedInspection {
    queenSeen?: boolean;
    queenColor?: string;
    queenYear?: string;
    eggsSeen?: boolean;
    honeyStores?: 'lite' | 'middels' | 'mye';
    temperament?: 'rolig' | 'urolig' | 'aggressiv';
    broodCondition?: 'darlig' | 'normal' | 'bra';
    broodEgg?: 'lite' | 'normal' | 'mye';
    broodLarvae?: 'lite' | 'normal' | 'mye';
    broodYngel?: 'lite' | 'normal' | 'mye';
    broodDrones?: 'lite' | 'normal' | 'mye';
    broodFrames?: string;
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
    const pickLast = <T extends string>(arr: T[]): T | undefined => arr.length ? arr[arr.length - 1] : undefined;

    const cmd = parseStructured(t);
    if (cmd.status) result.status = cmd.status;
    if (cmd.broodCondition) result.broodCondition = cmd.broodCondition as any;
    if (cmd.broodEgg) result.broodEgg = cmd.broodEgg as any;
    if (cmd.broodLarvae) result.broodLarvae = cmd.broodLarvae as any;
    if (cmd.broodYngel) result.broodYngel = cmd.broodYngel as any;
    if (cmd.broodDrones) result.broodDrones = cmd.broodDrones as any;
    if (cmd.broodFrames) result.broodFrames = cmd.broodFrames as any;
    if (cmd.honeyStores) result.honeyStores = cmd.honeyStores as any;
    if (cmd.temperament) result.temperament = cmd.temperament as any;
    if (cmd.eggsSeen !== undefined) result.eggsSeen = cmd.eggsSeen;
    if (cmd.queenSeen !== undefined) result.queenSeen = cmd.queenSeen;
    if (cmd.queenColor) result.queenColor = cmd.queenColor;
    if (cmd.queenYear) result.queenYear = cmd.queenYear;
    if (cmd.temperature) result.temperature = cmd.temperature;
    if (cmd.weather) result.weather = cmd.weather;
    if (
        result.status ||
        result.broodCondition ||
        result.broodEgg ||
        result.broodLarvae ||
        result.broodYngel ||
        result.broodDrones ||
        result.broodFrames ||
        result.honeyStores ||
        result.temperament ||
        result.eggsSeen !== undefined ||
        result.queenSeen !== undefined ||
        result.queenColor ||
        result.queenYear
    ) {
        return result;
    }

    // --- Queen color / year ---
    const normalizeColor = (c: string) => {
        const v = c.toLowerCase();
        if (v === 'hvit') return 'Hvit';
        if (v === 'gul') return 'Gul';
        if (v === 'rød' || v === 'rod') return 'Rød';
        if (v === 'grønn' || v === 'gronn') return 'Grønn';
        if (v === 'blå' || v === 'bla') return 'Blå';
        return '';
    };
    const colorMatch =
        t.match(/\b(dronningfarge|dronning\s*farge|farge)\s+(hvit|gul|rød|rod|grønn|gronn|blå|bla)\b/) ||
        t.match(/\b(hvit|gul|rød|rod|grønn|gronn|blå|bla)\s+dronning(a)?\b/);
    if (colorMatch) {
        const rawColor = String(colorMatch[2] || colorMatch[1] || '');
        const norm = normalizeColor(String(rawColor || ''));
        if (norm) result.queenColor = norm;
    }

    const yearMatch =
        t.match(/\b(årgang|ar(gang)?|år|alder)\s*(20\d{2})\b/) ||
        t.match(/\b(20\d{2})\s*(årgang|ar(gang)?|år|alder)\b/) ||
        (/\bdronning(a)?\b/.test(t) ? t.match(/\b(20\d{2})\b/) : null);
    if (yearMatch) {
        const yr = yearMatch.find((x) => /^\d{4}$/.test(String(x))) || '';
        if (yr) result.queenYear = String(yr);
    }

    // --- Action: Save Inspection ---
    if (has(['lagre inspeksjon', 'lagre skjema', 'lagring inspeksjon', 'lag inspeksjon', 'ferdig med inspeksjon', 'send inn', 'lagre nå', 'avslutt inspeksjon'])) {
        result.action = 'SAVE_INSPECTION';
    }

    // --- Action: Take Photo ---
    if (has(['ta bilde', 'ta et bilde', 'ta foto', 'knips'])) {
        result.action = 'TAKE_PHOTO';
    }

    // --- Queen ---
    if (has(['ingen dronning', 'ikke sett dronning', 'finner ikke dronning', 'mangler dronning', 'ser ikke dronning', 'hvor er hun', 'ingen dronning å se'])) {
        result.queenSeen = false;
    } else if (has(['dronning sett', 'sett dronning', 'ser dronning', 'så dronning', 'dronninga er her', 'merket dronning', 'fant dronning', 'der er hun', 'hun er her', 'dronning observert'])) {
        result.queenSeen = true;
    }

    // Ekstra fallback: hvis vi tydelig nevner dronning uten negative ord, tolkes som sett
    if (result.queenSeen === undefined) {
        const hasQueenWord = /\bdronning(a)?\b/.test(t);
        const hasNegator = /\bingen\b|\bikke\b|\bmangler\b|\bbytt\b/.test(t);
        if (hasQueenWord && !hasNegator) {
            result.queenSeen = true;
        }
    }

    // --- Eggs ---
    if (has(['ingen egg', 'ikke sett egg', 'tom for egg', 'ingen stift', 'tomme celler', 'ser ingen egg', 'ingen yngelstift'])) {
        result.eggsSeen = false;
    } else if (has(['egg sett', 'egseth', 'engeset', 'eggset', 'eggsatt', 'ser egg', 'masse egg', 'dagsferske', 'så egg', 'fant egg', 'stifter', 'nylagt egg', 'ser stift', 'egg i cellene'])) {
        result.eggsSeen = true;
    }
    // Ekstra fallback: nevnes 'egg' uten negasjon => tolkes som sett
    if (result.eggsSeen === undefined) {
        const hasEggWord = /\begg\b|\bstift\b/.test(t);
        const hasNegator = /\bingen\b|\bikke\b|\btomt\b/.test(t);
        if (hasEggWord && !hasNegator) {
            result.eggsSeen = true;
        }
    }

    // --- Honey (Fôr) ---
    if (has(['lite honning', 'tomt for honning', 'sulten', 'lite mat', 'lite fôr', 'trenger fôr', 'tomme tavler', 'sultne bier'])) {
        result.honeyStores = 'lite';
    } else if (has(['middels honning', 'greit med honning', 'litt honning', 'ok med mat', 'middels fôr', 'middel fôr', 'middel for'])) {
        result.honeyStores = 'middels';
    } else if (has(['mye honning', 'fullt av honning', 'tunge rammer', 'masse mat', 'full skattekasse', 'mye fôr', 'tunge tavler', 'godt med mat'])) {
        result.honeyStores = 'mye';
    }

    // --- Robust Fallback: Honey (Fôr) with mixed phrases / conflicting values ---
    if (!result.honeyStores) {
        const matches: ('lite'|'middels'|'mye')[] = [];
        // Pattern 1: context word before value
        const re1 = /\b(f[oø]r|for|thor|honning|mat)\s+(lite|middels|middel|mye)\b/g;
        // Pattern 2: value before context word
        const re2 = /\b(lite|middels|middel|mye)\s+(f[oø]r|for|thor|honning|mat)\b/g;
        let m: RegExpExecArray | null;
        while ((m = re1.exec(t)) !== null) {
            const scalar = m[2] === 'middel' ? 'middels' : m[2];
            matches.push(scalar as any);
        }
        while ((m = re2.exec(t)) !== null) {
            const scalar = m[1] === 'middel' ? 'middels' : m[1];
            matches.push(scalar as any);
        }
        // Pattern 3: if context exists anywhere, pick last mentioned scalar
        if (matches.length === 0 && /\b(honning|f[oø]r|for|thor|mat)\b/.test(t)) {
            if (/\bmye\b/.test(t)) matches.push('mye');
            if (/\bmiddels\b|\bmiddel\b/.test(t)) matches.push('middels');
            if (/\blite\b|\btomt\b/.test(t)) matches.push('lite');
        }
        const last = pickLast(matches);
        if (last) result.honeyStores = last;
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

    // --- Robust Fallback: Brood (Yngelleie) with mixed grammar / reordering / mishearing ---
    if (!result.broodCondition) {
        const hasYngelWord = /\byngel\b|\byngle\b|\byngre\b/.test(t);
        const hasYngleLike =
            hasYngelWord ||
            /(england|engel|engle|yngleie|yngelleie)/.test(t) ||
            /\blei(e)?\b/.test(t);

        if (hasYngleLike) {
            const order: ('darlig'|'normal'|'bra')[] = [];
            if (/\bd[åa]rlig\b|\blite\b/.test(t)) order.push('darlig');
            if (/\bnormal(t)?\b|\bgrei\b/.test(t)) order.push('normal');
            if (/\bbra\b|\bmye\b|\bmasse\b|\btett\b|\bfin\b/.test(t)) order.push('bra');
            const last = pickLast(order);
            if (last) result.broodCondition = last;
        }
    }

    const normAmount = (v: string): 'lite' | 'normal' | 'mye' | '' => {
        const s = (v || '').toLowerCase().trim();
        if (s === 'lite') return 'lite';
        if (s === 'normal' || s === 'normalt') return 'normal';
        if (s === 'mye' || s === 'masse') return 'mye';
        return '';
    };
    const parseAmountFor = (key: string): 'lite' | 'normal' | 'mye' | '' => {
        const re1 = new RegExp(`\\b${key}\\b\\s*(lite|normal(t)?|mye|masse)\\b`);
        const re2 = new RegExp(`\\b(lite|normal(t)?|mye|masse)\\b\\s*\\b${key}\\b`);
        const m1 = t.match(re1);
        const m2 = t.match(re2);
        const raw = (m1 && (m1[1] || '')) || (m2 && (m2[1] || '')) || '';
        return normAmount(String(raw || ''));
    };

    const eggA = parseAmountFor('egg');
    if (eggA) result.broodEgg = eggA;
    const larvA = parseAmountFor('larver') || parseAmountFor('larve');
    if (larvA) result.broodLarvae = larvA;
    const yngA = parseAmountFor('yngel');
    if (yngA) result.broodYngel = yngA;
    const drA = parseAmountFor('droner') || parseAmountFor('drone');
    if (drA) result.broodDrones = drA;

    const framesMatch =
        t.match(/\b(bistyrke|rammer(\s+med\s+yngel)?|yngelrammer)\s*[:\-]?\s*(\d+(?:[.,]5)?)\b/) ||
        t.match(/\b(\d+(?:[.,]5)?)\s*(rammer(\s+med\s+yngel)?|bistyrke|yngelrammer)\b/);
    if (framesMatch) {
        const num = framesMatch.find((x) => /^\d/.test(String(x))) || '';
        if (num) result.broodFrames = String(num).replace(',', '.');
    }

    // --- Status (Kubestatus) ---
    if (has(['død', 'tom kube', 'ingen bier'])) {
        result.status = 'Død';
    } else if (has(['sykdom', 'syk'])) {
        result.status = 'Sykdom';
    } else if (has(['varroa', 'varoa']) || (hasWord('midd') && !t.includes('middels'))) {
        result.status = 'Varroa mistanke';
    } else if (has(['bytt dronning', 'dronningbytte', 'ny dronning'])) {
        result.status = 'Bytt Dronning';
    } else if (has(['sverming', 'svømming', 'har svermet', 'sverm', 'svermetrang', 'fare for sverming', 'sverre trang', 'fare på svømming', 'fare for svømming'])) {
        result.status = 'Sverming';
    } else if (has(['byttet voks', 'byttet boks', 'vox', 'ny voks', 'smeltet voks'])) {
        result.status = 'Byttet voks';
    } else if (has(['mottatt fôr', 'mottatt for', 'fôret', 'foret', 'fikk mat', 'fikk fôr', 'fikk for'])) {
        result.status = 'Mottatt fôr';
    } else if (has(['skiftet rammer', 'skifte rammer', 'nye rammer', 'byttet rammer'])) {
        result.status = 'Skiftet rammer';
    } else if (has(['sterk', 'mye bier', 'kraftig'])) {
        result.status = 'Sterk';
    } else if (has(['svak', 'lite bier', 'stusselig'])) {
        result.status = 'Svak';
    } else if (has(['alt bra', 'fin kube', 'super', 'ok'])) {
        result.status = 'OK';
    }

    // --- Temperature ---
    // Match "20 grader", "temperatur 20", "20.5 grader"
    const tempMatch = t.match(/(\d+([.,]\d+)?)\s*(grader|[°º])/) || t.match(/temperatur\s*(\d+([.,]\d+)?)/);
    if (tempMatch) {
        result.temperature = tempMatch[1].replace(',', '.');
    }

    // --- Weather ---
    if (has(['sol', 'klart', 'fint vær'])) {
        result.weather = 'Klart';
    } else if (has(['regn', 'regner', 'vått'])) {
        result.weather = 'Regn';
    } else if (has(['overskyet', 'overskya', 'skyet'])) {
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
            if (/\bdød\b/.test(v)) out.status = 'Død';
            else if (/\bsykdom\b/.test(v)) out.status = 'Sykdom';
            else if (/\bvarroa\b|\bmidd\b(?!els)/.test(v)) out.status = 'Varroa mistanke';
            else if (/\bbytt\b.*\bdronning\b/.test(v)) out.status = 'Bytt Dronning';
            else if (/\bsverming\b|\bsverm(et|ing)?\b/.test(v)) out.status = 'Sverming';
            else if (/\bbyttet\b.*voks\b/.test(v)) out.status = 'Byttet voks';
            else if (/\bmottatt\b.*\bf[oø]r\b|\bf[oø]ret\b/.test(v)) out.status = 'Mottatt fôr';
            else if (/\bskiftet\b.*rammer\b|\bbyttet\b.*rammer\b/.test(v)) out.status = 'Skiftet rammer';
            else if (/\bsterk\b/.test(v)) out.status = 'Sterk';
            else if (/\bsvak\b/.test(v)) out.status = 'Svak';
            else if (/\bok\b|\balt bra\b|\bfin\b/.test(v)) out.status = 'OK';
        } else if (key === 'yngel') {
            if (/\blite\b/.test(v)) out.broodYngel = 'lite';
            else if (/\bmye\b|\bmasse\b/.test(v)) out.broodYngel = 'mye';
            else if (/\bnormal(t)?\b/.test(v)) out.broodYngel = 'normal';
            else if (/\bd[åa]rlig\b/.test(v)) out.broodCondition = 'darlig';
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
            if (/\blite\b/.test(v)) out.broodEgg = 'lite';
            else if (/\bmye\b|\bmasse\b/.test(v)) out.broodEgg = 'mye';
            else if (/\bnormal(t)?\b/.test(v)) out.broodEgg = 'normal';
            else if (/\bingen\b|\bikke\b/.test(v)) out.eggsSeen = false;
            else if (/\bsett\b|\bser\b|\bmasse\b|\bs[oa]?\b/.test(v)) out.eggsSeen = true;
        } else if (key === 'dronning') {
            if (/\bingen\b|\bikke\b|\bmangler\b/.test(v)) out.queenSeen = false;
            else if (/\bsett\b|\bser\b|\bfant\b/.test(v)) out.queenSeen = true;
        } else if (key === 'larver' || key === 'larve') {
            if (/\blite\b/.test(v)) out.broodLarvae = 'lite';
            else if (/\bmye\b|\bmasse\b/.test(v)) out.broodLarvae = 'mye';
            else if (/\bnormal(t)?\b/.test(v)) out.broodLarvae = 'normal';
        } else if (key === 'droner' || key === 'drone') {
            if (/\blite\b/.test(v)) out.broodDrones = 'lite';
            else if (/\bmye\b|\bmasse\b/.test(v)) out.broodDrones = 'mye';
            else if (/\bnormal(t)?\b/.test(v)) out.broodDrones = 'normal';
        } else if (key === 'bistyrke' || key === 'rammer') {
            const m = v.match(/\b(\d+(?:[.,]5)?)\b/);
            if (m) out.broodFrames = m[1].replace(',', '.');
        } else if (key === 'dronningfarge' || key === 'dronning farge' || key === 'farge') {
            if (/\bhvit\b/.test(v)) out.queenColor = 'Hvit';
            else if (/\bgul\b/.test(v)) out.queenColor = 'Gul';
            else if (/\br[øo]d\b/.test(v)) out.queenColor = 'Rød';
            else if (/\bgr[øo]nn\b/.test(v)) out.queenColor = 'Grønn';
            else if (/\bbl[åa]\b/.test(v)) out.queenColor = 'Blå';
        } else if (key === 'årgang' || key === 'ar' || key === 'år' || key === 'alder') {
            const m = v.match(/\b(20\d{2})\b/);
            if (m) out.queenYear = m[1];
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
        const m = line.match(/\b(status|yngel|honning|gemytt|temperament|egg|larver|larve|droner|drone|bistyrke|rammer|dronning|temperatur|vær|vaer)\s*[:\-]\s*([^:;|]+)/);
        if (m) {
            take(m[1], m[2]);
        }
    }
    return out;
}

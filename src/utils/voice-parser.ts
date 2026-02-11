export interface ParsedInspection {
    queenSeen?: boolean;
    eggsSeen?: boolean;
    honeyStores?: 'lite' | 'middels' | 'mye';
    temperament?: 'rolig' | 'urolig' | 'aggressiv';
    broodCondition?: 'darlig' | 'normal' | 'bra';
    status?: string;
    temperature?: string;
    weather?: string;
}

export function parseVoiceCommand(text: string): ParsedInspection {
    const t = text.toLowerCase();
    const result: ParsedInspection = {};

    // Helper for regex matching
    const has = (patterns: string[]) => patterns.some(p => t.includes(p));

    // --- Queen ---
    if (has(['ingen dronning', 'ikke sett dronning', 'finner ikke dronning', 'mangler dronning'])) {
        result.queenSeen = false;
    } else if (has(['dronning sett', 'ser dronning', 'så dronning', 'dronninga er her', 'merket dronning', 'fant dronning'])) {
        result.queenSeen = true;
    }

    // --- Eggs ---
    if (has(['ingen egg', 'ikke sett egg', 'tom for egg', 'ingen stift'])) {
        result.eggsSeen = false;
    } else if (has(['egg sett', 'ser egg', 'masse egg', 'dagsferske', 'så egg', 'fant egg', 'stifter'])) {
        result.eggsSeen = true;
    }

    // --- Honey ---
    if (has(['lite honning', 'tomt for honning', 'sulten', 'lite mat'])) {
        result.honeyStores = 'lite';
    } else if (has(['middels honning', 'greit med honning', 'litt honning', 'ok med mat'])) {
        result.honeyStores = 'middels';
    } else if (has(['mye honning', 'fullt av honning', 'tunge rammer', 'masse mat', 'full skattekasse'])) {
        result.honeyStores = 'mye';
    }

    // --- Temperament ---
    if (has(['rolig', 'snille', 'greie bier', 'rolige bier'])) {
        result.temperament = 'rolig';
    } else if (has(['urolig', 'løper', 'stressede', 'nervøse'])) {
        result.temperament = 'urolig';
    } else if (has(['aggressiv', 'sint', 'stikker', 'vonde', 'angriper'])) {
        result.temperament = 'aggressiv';
    }

    // --- Brood (Yngel) ---
    if (has(['dårlig yngel', 'lite yngel', 'hullete yngel'])) {
        result.broodCondition = 'darlig';
    } else if (has(['bra yngel', 'tett yngel', 'fin yngel', 'masse yngel'])) {
        result.broodCondition = 'bra';
    } else if (has(['normal yngel', 'grei yngel'])) {
        result.broodCondition = 'normal';
    }

    // --- Status ---
    if (has(['svak', 'lite bier', 'stusselig'])) {
        result.status = 'SVAK';
    } else if (has(['død', 'tom kube', 'ingen bier'])) {
        result.status = 'DØD';
    } else if (has(['alt bra', 'fin kube', 'sterk', 'super'])) {
        result.status = 'OK';
    } else if (has(['sykdom', 'syk'])) {
        result.status = 'SYKDOM';
    } else if (has(['sverming', 'har svermet', 'sverm'])) {
        result.status = 'SVERMING';
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

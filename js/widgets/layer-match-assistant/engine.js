const CHUNK_SIZE = 200;
const METERS_PER_FOOT = 0.3048;
const FEET_PER_METER = 3.28084;
const EARTH_RADIUS_M = 6371000;

export const MATCH_STATUS = {
    CONFIRMED: 'Confirmed match',
    LIKELY: 'Likely match',
    POSSIBLE: 'Possible match',
    CONFLICT: 'Conflict',
    NO_MATCH: 'No match',
    REJECTED: 'Rejected by user',
    APPROVED: 'Approved by user'
};

export const STRICTNESS_OPTIONS = [
    { value: 'strict', label: 'Strict' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'loose', label: 'Loose' }
];

export const SPATIAL_TOLERANCE_PRESETS = [
    { value: 'exact', label: 'Exact coordinates', feet: 0 },
    { value: 'very_close', label: 'Very close (10 ft)', feet: 10 },
    { value: 'close', label: 'Close (50 ft)', feet: 50 },
    { value: 'nearby', label: 'Nearby (250 ft)', feet: 250 },
    { value: 'custom', label: 'Custom distance', feet: null }
];

export const STRICTNESS_PRESETS = {
    strict: {
        confirmed: 92,
        likely: 80,
        possible: 65,
        conflictGap: 10,
        typeConflictPenalty: 25
    },
    balanced: {
        confirmed: 90,
        likely: 75,
        possible: 55,
        conflictGap: 8,
        typeConflictPenalty: 15
    },
    loose: {
        confirmed: 85,
        likely: 70,
        possible: 50,
        conflictGap: 6,
        typeConflictPenalty: 10
    }
};

export const DEFAULT_WEIGHTS = {
    spatial: 0.7,
    name: 0.25,
    optional: 0.05
};

const ABBREVIATIONS = {
    st: 'saint',
    mt: 'mount',
    rd: 'road',
    ave: 'avenue',
    av: 'avenue',
    blvd: 'boulevard',
    hwy: 'highway',
    ln: 'lane',
    dr: 'drive',
    co: 'county',
    ctr: 'center',
    cntr: 'center',
    sta: 'station',
    cab: 'cabinet',
    ped: 'pedestal',
    bldg: 'building',
    dept: 'department',
    no: 'number',
    num: 'number'
};

const FILLER_TOKENS = new Set([
    'the', 'a', 'an', 'and', 'of', 'at', 'to', 'for', 'in', 'on'
]);

const ASSET_TYPE_WORDS = new Set([
    'cabinet', 'pedestal', 'vault', 'hut', 'pole', 'site', 'tower',
    'meter', 'hydrant', 'station', 'office', 'node', 'splice', 'handhole', 'manhole'
]);

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getStrictnessPreset(strictness = 'balanced') {
    return STRICTNESS_PRESETS[strictness] || STRICTNESS_PRESETS.balanced;
}

export function tolerancePresetToFeet(preset, customFeet) {
    if (preset === 'custom') {
        const value = parseFloat(customFeet);
        return Number.isFinite(value) && value >= 0 ? value : 50;
    }
    const entry = SPATIAL_TOLERANCE_PRESETS.find((item) => item.value === preset);
    return entry?.feet ?? 50;
}

export function normalizeText(value) {
    let text = String(value ?? '').toLowerCase().trim();
    text = text.replace(/['’]/g, '');
    text = text.replace(/[.,/#!$%^&*;:{}=_`~()"[\]?\\|<>@+-]/g, ' ');
    text = text.replace(/[_\-/]+/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    return normalizeAbbreviations(text);
}

export function normalizeAbbreviations(text) {
    if (!text) return '';
    const tokens = text.split(/\s+/).filter(Boolean);
    return tokens.map((token) => ABBREVIATIONS[token] || token).join(' ');
}

export function tokenizeText(text) {
    const normalized = normalizeText(text);
    return normalized.split(/\s+/).filter((token) => token && !FILLER_TOKENS.has(token));
}

export function stripParenthetical(text) {
    return String(text ?? '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isIdentifierToken(token) {
    if (!token) return false;
    if (/^\d+$/.test(token)) return true;
    if (/^r\d+$/i.test(token)) return true;
    if (/^[a-z]{1,2}\d+$/i.test(token)) return true;
    return false;
}

export function extractBaseName(text) {
    const withoutParens = stripParenthetical(text);
    const tokens = tokenizeText(withoutParens);
    const baseTokens = [];
    for (const token of tokens) {
        if (isIdentifierToken(token)) break;
        baseTokens.push(token);
    }
    if (baseTokens.length) return baseTokens.join(' ');
    return tokens.filter((token) => !isIdentifierToken(token)).join(' ');
}

export function baseNameScore(a, b) {
    const left = extractBaseName(a);
    const right = extractBaseName(b);
    if (!left || !right) return 0;
    if (left === right) return 100;
    return Math.max(
        tokenOverlapScore(left, right),
        containsScore(left, right),
        levenshteinScore(left, right)
    );
}

export function prefixTokenScore(a, b) {
    const leftTokens = tokenizeText(stripParenthetical(a));
    const rightTokens = tokenizeText(stripParenthetical(b));
    if (!leftTokens.length || !rightTokens.length) return 0;
    let shared = 0;
    const limit = Math.min(leftTokens.length, rightTokens.length);
    for (let i = 0; i < limit; i++) {
        if (leftTokens[i] !== rightTokens[i]) break;
        shared++;
    }
    if (shared === 0) return 0;
    const maxCount = Math.max(leftTokens.length, rightTokens.length);
    return clamp((shared / maxCount) * 100, 0, 100);
}

export function extractSignificantNumbers(text) {
    return extractNumbers(stripParenthetical(text));
}

export function extractNumbers(text) {
    const normalized = normalizeText(text);
    const matches = normalized.match(/\d+(?:\.\d+)?/g);
    return matches ? [...new Set(matches)] : [];
}

export function levenshteinDistance(a, b) {
    const left = String(a ?? '');
    const right = String(b ?? '');
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
    for (let i = 0; i <= left.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= right.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= left.length; i++) {
        for (let j = 1; j <= right.length; j++) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[left.length][right.length];
}

export function levenshteinScore(a, b) {
    const left = String(a ?? '');
    const right = String(b ?? '');
    const maxLength = Math.max(left.length, right.length);
    if (maxLength === 0) return 100;
    const distance = levenshteinDistance(left, right);
    return clamp((1 - distance / maxLength) * 100, 0, 100);
}

export function exactNormalizedScore(a, b) {
    const left = normalizeText(a);
    const right = normalizeText(b);
    return left && left === right ? 100 : 0;
}

export function containsScore(a, b) {
    const left = normalizeText(a);
    const right = normalizeText(b);
    if (!left || !right) return 0;
    if (left === right) return 100;
    const shorter = left.length <= right.length ? left : right;
    const longer = left.length > right.length ? left : right;
    if (longer.includes(shorter)) {
        return clamp((shorter.length / longer.length) * 100, 60, 95);
    }
    return 0;
}

export function tokenOverlapScore(a, b) {
    const leftTokens = tokenizeText(a);
    const rightTokens = tokenizeText(b);
    if (!leftTokens.length || !rightTokens.length) return 0;
    const rightSet = new Set(rightTokens);
    const shared = leftTokens.filter((token) => rightSet.has(token)).length;
    const maxCount = Math.max(leftTokens.length, rightTokens.length);
    return clamp((shared / maxCount) * 100, 0, 100);
}

export function tokenSortScore(a, b) {
    const left = tokenizeText(a).slice().sort().join(' ');
    const right = tokenizeText(b).slice().sort().join(' ');
    if (!left || !right) return 0;
    if (left === right) return 100;
    return levenshteinScore(left, right);
}

export function numberMatchScore(a, b) {
    const baseA = extractBaseName(a);
    const baseB = extractBaseName(b);
    const baseMatches = Boolean(baseA && baseB && baseA === baseB);

    const leftNumbers = extractSignificantNumbers(a);
    const rightNumbers = extractSignificantNumbers(b);
    if (!leftNumbers.length && !rightNumbers.length) return null;
    if (!leftNumbers.length || !rightNumbers.length) return baseMatches ? null : 50;
    const rightSet = new Set(rightNumbers);
    const shared = leftNumbers.filter((num) => rightSet.has(num));
    if (shared.length > 0) return 100;
    if (baseMatches) {
        const baseTokenCount = baseA.split(/\s+/).filter(Boolean).length;
        if (baseTokenCount >= 2) return null;
        return 20;
    }
    return 20;
}

export function detectAssetTypeConflict(a, b) {
    const leftTypes = tokenizeText(a).filter((token) => ASSET_TYPE_WORDS.has(token));
    const rightTypes = tokenizeText(b).filter((token) => ASSET_TYPE_WORDS.has(token));
    if (!leftTypes.length || !rightTypes.length) return false;
    const rightSet = new Set(rightTypes);
    return !leftTypes.some((token) => rightSet.has(token));
}

export function computeNameScore(aName, bName, options = {}) {
    const strictness = getStrictnessPreset(options.strictness);
    if (!aName && !bName) return null;
    if (!aName || !bName) return 0;

    const left = normalizeText(aName);
    const right = normalizeText(bName);
    if (left === right) return 100;

    const overlap = tokenOverlapScore(aName, bName);
    const contains = containsScore(aName, bName);
    const sortScore = tokenSortScore(aName, bName);
    const levenshtein = levenshteinScore(left, right);
    const baseScore = baseNameScore(aName, bName);
    const prefix = prefixTokenScore(aName, bName);
    const numberScore = numberMatchScore(aName, bName);

    let score = Math.max(overlap, contains, sortScore, levenshtein, baseScore, prefix);
    if (numberScore != null) {
        score = score * 0.9 + numberScore * 0.1;
    }

    if (detectAssetTypeConflict(aName, bName)) {
        score -= strictness.typeConflictPenalty;
    }
    if (numberScore === 20 && baseScore < 85) {
        score -= Math.min(15, strictness.typeConflictPenalty / 2);
    }

    return clamp(score, 0, 100);
}

export function parseCoordinate(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    const cleaned = String(value).trim().replace(/[^\d.+\-eE]/g, '');
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

export function detectLatLonSwap(lat, lon) {
    const parsedLat = parseCoordinate(lat);
    const parsedLon = parseCoordinate(lon);
    if (parsedLat == null || parsedLon == null) return false;
    const latOutOfRange = Math.abs(parsedLat) > 90;
    const lonInLatRange = Math.abs(parsedLon) <= 90;
    return latOutOfRange && lonInLatRange;
}

export function coordinatePrecision(value) {
    const parsed = parseCoordinate(value);
    if (parsed == null) return 0;
    const text = String(value).trim();
    const decimalMatch = text.match(/\.(\d+)/);
    return decimalMatch ? decimalMatch[1].length : 0;
}

export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const aLat = parseCoordinate(lat1);
    const aLon = parseCoordinate(lon1);
    const bLat = parseCoordinate(lat2);
    const bLon = parseCoordinate(lon2);
    if ([aLat, aLon, bLat, bLon].some((value) => value == null)) return Infinity;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLon = toRad(bLon - aLon);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat
        + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLon * sinLon;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function metersToFeet(meters) {
    if (!Number.isFinite(meters)) return null;
    return meters * FEET_PER_METER;
}

export function computeSpatialScore(distanceFeet, toleranceFeet, options = {}) {
    if (!Number.isFinite(distanceFeet)) return 0;
    if (distanceFeet === 0 || toleranceFeet === 0) {
        return distanceFeet === 0 ? 100 : 0;
    }

    if (distanceFeet > toleranceFeet) {
        const graceFeet = toleranceFeet * 1.5;
        if (distanceFeet <= graceFeet) {
            const overRatio = (distanceFeet - toleranceFeet) / (graceFeet - toleranceFeet);
            return clamp(Math.round(78 * (1 - overRatio * 0.65)), 40, 78);
        }
        return 0;
    }

    if (distanceFeet <= 5) return 98;
    if (distanceFeet <= 10) return 95;
    if (distanceFeet <= 25) return 88;
    if (distanceFeet <= 50) return 80;
    if (distanceFeet <= 100) return 70;
    if (distanceFeet <= 250) return 55;
    if (distanceFeet <= 500) return 40;

    const smooth = 100 * (1 - distanceFeet / toleranceFeet);
    return clamp(Math.round(smooth), 0, 100);
}

export function computeOptionalFieldScore(aRecord, bRecord, fieldPairs = [], options = {}) {
    if (!fieldPairs.length) return null;
    const scores = [];
    fieldPairs.forEach(({ fieldA, fieldB }) => {
        const left = aRecord?.fields?.[fieldA];
        const right = bRecord?.fields?.[fieldB];
        if (left == null && right == null) return;
        if (left == null || right == null) {
            scores.push(0);
            return;
        }
        const leftNorm = normalizeText(left);
        const rightNorm = normalizeText(right);
        scores.push(leftNorm === rightNorm ? 100 : levenshteinScore(leftNorm, rightNorm));
    });
    if (!scores.length) return null;
    return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

export function computeFinalScore(scores = {}, weights = DEFAULT_WEIGHTS) {
    const spatial = scores.spatialScore ?? 0;
    const name = scores.nameScore;
    const optional = scores.optionalFieldScore;

    let spatialWeight = weights.spatial ?? DEFAULT_WEIGHTS.spatial;
    let nameWeight = name == null ? 0 : (weights.name ?? DEFAULT_WEIGHTS.name);
    let optionalWeight = optional == null ? 0 : (weights.optional ?? DEFAULT_WEIGHTS.optional);

    const totalWeight = spatialWeight + nameWeight + optionalWeight;
    if (totalWeight <= 0) return 0;

    spatialWeight /= totalWeight;
    nameWeight /= totalWeight;
    optionalWeight /= totalWeight;

    const nameValue = name == null ? 0 : name;
    const optionalValue = optional == null ? 0 : optional;

    return clamp(
        spatial * spatialWeight + nameValue * nameWeight + optionalValue * optionalWeight,
        0,
        100
    );
}

export function classifyMatch(finalScore, conflictInfo = {}, options = {}) {
    const preset = getStrictnessPreset(options.strictness);
    if (conflictInfo.isConflict) {
        return MATCH_STATUS.CONFLICT;
    }
    if (finalScore >= preset.confirmed) return MATCH_STATUS.CONFIRMED;
    if (finalScore >= preset.likely) return MATCH_STATUS.LIKELY;
    if (finalScore >= preset.possible) return MATCH_STATUS.POSSIBLE;
    return MATCH_STATUS.NO_MATCH;
}

export function buildMatchReason({
    matchStatus,
    distanceFeet,
    spatialScore,
    nameScore,
    optionalFieldScore,
    aName,
    bName,
    conflictInfo = {}
}) {
    const distText = Number.isFinite(distanceFeet)
        ? `${Math.round(distanceFeet)} ft apart`
        : 'distance unavailable';

    if (matchStatus === MATCH_STATUS.NO_MATCH) {
        return 'No match: no Layer B records found within selected distance tolerance.';
    }
    if (matchStatus === MATCH_STATUS.CONFLICT) {
        if (conflictInfo.multipleBCandidates) {
            return `Conflict: two nearby Layer B records have similar match scores (${Math.round(conflictInfo.bestScore || 0)} vs ${Math.round(conflictInfo.secondScore || 0)}).`;
        }
        if (conflictInfo.multipleAOnB) {
            return 'Conflict: multiple Layer A records match the same Layer B record.';
        }
        return `Conflict: best candidates are within ${conflictInfo.scoreGap ?? 8} points of each other.`;
    }

    const namePart = nameScore != null
        ? (nameScore >= 95
            ? 'normalized names match closely'
            : `names score ${Math.round(nameScore)}% similar`)
        : 'name comparison not used';

    const optionalPart = optionalFieldScore != null && optionalFieldScore >= 80
        ? ', supporting fields align'
        : '';

    if (matchStatus === MATCH_STATUS.CONFIRMED) {
        if (spatialScore >= 95 && nameScore >= 95) {
            return `Confirmed match: coordinates are ${distText} and normalized names match exactly.`;
        }
        if (nameScore >= 95) {
            return `Confirmed match: records are ${distText} and share the same base name${optionalPart}.`;
        }
        return `Confirmed match: records are ${distText} and ${namePart}${optionalPart}.`;
    }
    if (matchStatus === MATCH_STATUS.LIKELY) {
        return `Likely match: records are ${distText} and ${namePart}${optionalPart}.`;
    }
    return `Possible match: records are ${distText} but ${namePart}${optionalPart}.`;
}

function precomputeRecord(record) {
    return {
        ...record,
        normalizedName: record.name != null ? normalizeText(record.name) : '',
        tokens: record.name != null ? tokenizeText(record.name) : [],
        numbers: record.name != null ? extractNumbers(record.name) : []
    };
}

function candidateSearchFeet(toleranceFeet) {
    return toleranceFeet === 0 ? 0 : toleranceFeet * 1.5;
}

export function buildSpatialGridIndex(records = [], options = {}) {
    const toleranceFeet = options.toleranceFeet ?? 50;
    const searchFeet = candidateSearchFeet(toleranceFeet);
    const toleranceMeters = searchFeet * METERS_PER_FOOT;
    const cellSizeDeg = Math.max(toleranceMeters / 111320, 0.00001);
    const index = new Map();

    records.forEach((record, idx) => {
        if (record.lat == null || record.lon == null) return;
        const cellX = Math.floor(record.lon / cellSizeDeg);
        const cellY = Math.floor(record.lat / cellSizeDeg);
        const key = `${cellX}:${cellY}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ record, idx });
    });

    return { index, cellSizeDeg };
}

export function findNearbyCandidates(record, gridIndex, options = {}) {
    const { index, cellSizeDeg } = gridIndex;
    if (!index || record.lat == null || record.lon == null) return [];

    const toleranceFeet = options.toleranceFeet ?? 50;
    const searchFeet = candidateSearchFeet(toleranceFeet);
    const toleranceMeters = searchFeet * METERS_PER_FOOT;
    const cellX = Math.floor(record.lon / cellSizeDeg);
    const cellY = Math.floor(record.lat / cellSizeDeg);
    const radius = Math.max(1, Math.ceil(searchFeet / 250));
    const candidates = [];

    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const key = `${cellX + dx}:${cellY + dy}`;
            const bucket = index.get(key);
            if (!bucket) continue;
            bucket.forEach(({ record: candidate, idx }) => {
                const distanceMeters = haversineDistanceMeters(
                    record.lat, record.lon, candidate.lat, candidate.lon
                );
                const distanceFeet = metersToFeet(distanceMeters);
                if (distanceMeters <= toleranceMeters || toleranceFeet === 0) {
                    candidates.push({ record: candidate, idx, distanceMeters, distanceFeet });
                }
            });
        }
    }

    return candidates;
}

export function scoreCandidate(aRecord, bRecord, options = {}) {
    const toleranceFeet = options.toleranceFeet ?? 50;
    const textOnly = options.textOnly === true;
    const weights = options.weights || DEFAULT_WEIGHTS;
    const strictness = options.strictness || 'balanced';

    let distanceMeters = Infinity;
    let distanceFeet = null;
    let spatialScore = 0;

    const hasCoords = aRecord.lat != null && aRecord.lon != null
        && bRecord.lat != null && bRecord.lon != null;

    if (hasCoords) {
        distanceMeters = haversineDistanceMeters(
            aRecord.lat, aRecord.lon, bRecord.lat, bRecord.lon
        );
        distanceFeet = metersToFeet(distanceMeters);
        spatialScore = computeSpatialScore(distanceFeet, toleranceFeet, options);
    } else if (textOnly) {
        spatialScore = 0;
    } else {
        return null;
    }

    if (!textOnly && spatialScore === 0 && toleranceFeet > 0) {
        return null;
    }

    const nameScore = options.nameFieldsSelected === false
        ? null
        : computeNameScore(aRecord.name, bRecord.name, { strictness });

    const optionalFieldScore = computeOptionalFieldScore(
        aRecord,
        bRecord,
        options.optionalFieldPairs || [],
        options
    );

    let finalScore = computeFinalScore(
        { spatialScore, nameScore, optionalFieldScore },
        weights
    );

    const baseScore = options.nameFieldsSelected === false
        ? 0
        : baseNameScore(aRecord.name, bRecord.name);
    if (
        baseScore >= 95
        && Number.isFinite(distanceFeet)
        && distanceFeet <= toleranceFeet * 1.5
    ) {
        finalScore = Math.max(finalScore, 78 + Math.min(17, baseScore - 78));
    }

    return {
        source_a_uid: aRecord.uid,
        source_b_uid: bRecord.uid,
        a_name: aRecord.name ?? '',
        b_name: bRecord.name ?? '',
        a_lat: aRecord.lat,
        a_lon: aRecord.lon,
        b_lat: bRecord.lat,
        b_lon: bRecord.lon,
        distance_meters: Number.isFinite(distanceMeters) ? distanceMeters : null,
        distance_feet: distanceFeet,
        spatial_score: spatialScore,
        name_score: nameScore,
        optional_field_score: optionalFieldScore,
        final_score: finalScore,
        user_decision: null,
        a_index: aRecord.featureIndex,
        b_index: bRecord.featureIndex
    };
}

export function validateLayerMatchInput(input = {}) {
    const errors = [];
    const warnings = [];

    const layerA = input.layerA || [];
    const layerB = input.layerB || [];
    const options = input.options || {};

    if (!layerA.length) errors.push('Layer A has no records to match.');
    if (!layerB.length) errors.push('Layer B has no records to match.');

    const textOnly = options.textOnly === true;
    const missingA = layerA.filter((record) => record.lat == null || record.lon == null).length;
    const missingB = layerB.filter((record) => record.lat == null || record.lon == null).length;

    if (!textOnly) {
        if (missingA === layerA.length) errors.push('Layer A has no usable coordinates.');
        if (missingB === layerB.length) errors.push('Layer B has no usable coordinates.');
        if (missingA > 0 && missingA < layerA.length) {
            warnings.push(`${missingA} Layer A record(s) missing coordinates will be skipped.`);
        }
        if (missingB > 0 && missingB < layerB.length) {
            warnings.push(`${missingB} Layer B record(s) missing coordinates will be skipped.`);
        }
    } else if (missingA > 0 || missingB > 0) {
        warnings.push('Text-only matching enabled for records without coordinates.');
    }

    let swapCount = 0;
    layerA.forEach((record) => {
        if (detectLatLonSwap(record.lat, record.lon)) swapCount++;
    });
    layerB.forEach((record) => {
        if (detectLatLonSwap(record.lat, record.lon)) swapCount++;
    });
    if (swapCount > 0) {
        warnings.push(`${swapCount} record(s) may have latitude/longitude fields swapped.`);
    }

    if (!options.nameFieldsSelected) {
        warnings.push('No name fields selected; matching will rely on spatial distance only.');
    }

    const totalPairs = layerA.length * layerB.length;
    if (totalPairs > 250000) {
        warnings.push('Large dataset detected; matching may take a while.');
    }

    return { errors, warnings };
}

function nextTick() {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
            return;
        }
        setTimeout(resolve, 0);
    });
}

export function buildLayerMatchPreview(input = {}, sampleSize = 10) {
    const full = runLayerMatchSync(input);
    const sampleMatches = full.matches.slice(0, sampleSize);
    const columns = [
        '#', 'a_name', 'b_name', 'distance_feet', 'spatial_score',
        'name_score', 'final_score', 'match_status'
    ];
    const rows = sampleMatches.map((match, idx) => ({
        '#': idx + 1,
        a_name: match.a_name,
        b_name: match.b_name,
        distance_feet: match.distance_feet != null ? Math.round(match.distance_feet) : '-',
        spatial_score: Math.round(match.spatial_score ?? 0),
        name_score: match.name_score != null ? Math.round(match.name_score) : '-',
        final_score: Math.round(match.final_score ?? 0),
        match_status: match.match_status
    }));
    return { columns, rows, warnings: full.warnings };
}

export function runLayerMatchSync(input = {}) {
    const layerA = (input.layerA || []).map(precomputeRecord);
    const layerB = (input.layerB || []).map(precomputeRecord);
    const options = {
        toleranceFeet: input.options?.toleranceFeet ?? 50,
        strictness: input.options?.strictness ?? 'balanced',
        textOnly: input.options?.textOnly === true,
        nameFieldsSelected: input.options?.nameFieldsSelected !== false,
        optionalFieldPairs: input.options?.optionalFieldPairs || [],
        weights: input.options?.weights || DEFAULT_WEIGHTS
    };
    const preset = getStrictnessPreset(options.strictness);

    const validation = validateLayerMatchInput({ layerA, layerB, options });
    if (validation.errors.length) {
        return {
            matches: [],
            unmatchedA: layerA,
            unmatchedB: layerB,
            conflicts: [],
            warnings: [...validation.warnings, ...validation.errors],
            stats: { totalA: layerA.length, totalB: layerB.length, byStatus: {} },
            errors: validation.errors
        };
    }

    const gridIndex = buildSpatialGridIndex(layerB, options);
    const matches = [];
    const unmatchedA = [];
    const bClaimCounts = new Map();

    layerA.forEach((aRecord) => {
        if (!options.textOnly && (aRecord.lat == null || aRecord.lon == null)) {
            unmatchedA.push(aRecord);
            return;
        }

        let candidates = findNearbyCandidates(aRecord, gridIndex, options);
        if (options.textOnly && !candidates.length) {
            candidates = layerB.map((record, idx) => ({
                record,
                idx,
                distanceMeters: hasCoordsPair(aRecord, record)
                    ? haversineDistanceMeters(aRecord.lat, aRecord.lon, record.lat, record.lon)
                    : null,
                distanceFeet: hasCoordsPair(aRecord, record)
                    ? metersToFeet(haversineDistanceMeters(aRecord.lat, aRecord.lon, record.lat, record.lon))
                    : null
            }));
        }

        const scored = candidates
            .map(({ record }) => scoreCandidate(aRecord, record, options))
            .filter(Boolean)
            .sort((left, right) => right.final_score - left.final_score);

        if (!scored.length) {
            unmatchedA.push(aRecord);
            return;
        }

        const best = scored[0];
        const second = scored[1];
        const conflictInfo = {};
        if (second && (best.final_score - second.final_score) < preset.conflictGap) {
            conflictInfo.isConflict = true;
            conflictInfo.multipleBCandidates = true;
            conflictInfo.bestScore = best.final_score;
            conflictInfo.secondScore = second.final_score;
            conflictInfo.scoreGap = best.final_score - second.final_score;
        }

        best.match_status = classifyMatch(best.final_score, conflictInfo, options);
        best.match_reason = buildMatchReason({
            matchStatus: best.match_status,
            distanceFeet: best.distance_feet,
            spatialScore: best.spatial_score,
            nameScore: best.name_score,
            optionalFieldScore: best.optional_field_score,
            aName: best.a_name,
            bName: best.b_name,
            conflictInfo
        });

        if (best.match_status === MATCH_STATUS.NO_MATCH) {
            unmatchedA.push(aRecord);
            return;
        }

        matches.push(best);
        bClaimCounts.set(best.source_b_uid, (bClaimCounts.get(best.source_b_uid) || 0) + 1);
    });

    const conflicts = [];
    matches.forEach((match) => {
        if (bClaimCounts.get(match.source_b_uid) > 1) {
            match.match_status = MATCH_STATUS.CONFLICT;
            match.match_reason = buildMatchReason({
                matchStatus: MATCH_STATUS.CONFLICT,
                distanceFeet: match.distance_feet,
                spatialScore: match.spatial_score,
                nameScore: match.name_score,
                optionalFieldScore: match.optional_field_score,
                aName: match.a_name,
                bName: match.b_name,
                conflictInfo: { isConflict: true, multipleAOnB: true }
            });
            conflicts.push(match);
        } else if (match.match_status === MATCH_STATUS.CONFLICT) {
            conflicts.push(match);
        }
    });

    const matchedB = new Set(matches.map((match) => match.source_b_uid));
    const unmatchedB = layerB.filter((record) => !matchedB.has(record.uid));

    const byStatus = {};
    Object.values(MATCH_STATUS).forEach((status) => { byStatus[status] = 0; });
    matches.forEach((match) => {
        byStatus[match.match_status] = (byStatus[match.match_status] || 0) + 1;
    });
    unmatchedA.forEach(() => { byStatus[MATCH_STATUS.NO_MATCH] = (byStatus[MATCH_STATUS.NO_MATCH] || 0) + 1; });

    return {
        matches,
        unmatchedA,
        unmatchedB,
        conflicts,
        warnings: validation.warnings,
        stats: {
            totalA: layerA.length,
            totalB: layerB.length,
            byStatus
        },
        errors: []
    };
}

function hasCoordsPair(a, b) {
    return a.lat != null && a.lon != null && b.lat != null && b.lon != null;
}

export async function runLayerMatch(input = {}, handlers = {}) {
    const layerA = input.layerA || [];
    const layerB = input.layerB || [];
    const options = input.options || {};
    const total = layerA.length;
    let processed = 0;
    const partialA = [];
    const partialB = layerB.map(precomputeRecord);

    while (processed < total) {
        if (handlers.isCancelled?.()) {
            return {
                cancelled: true,
                matches: [],
                unmatchedA: [],
                unmatchedB: [],
                conflicts: [],
                warnings: ['Matching cancelled.'],
                stats: { totalA: total, totalB: layerB.length, byStatus: {} }
            };
        }

        const chunkEnd = Math.min(processed + CHUNK_SIZE, total);
        partialA.push(...layerA.slice(processed, chunkEnd).map(precomputeRecord));
        processed = chunkEnd;
        handlers.onProgress?.(`Matching... ${processed.toLocaleString()} / ${total.toLocaleString()}`);
        await nextTick();
    }

    return runLayerMatchSync({
        layerA: partialA,
        layerB: partialB,
        options
    });
}

export { CHUNK_SIZE };

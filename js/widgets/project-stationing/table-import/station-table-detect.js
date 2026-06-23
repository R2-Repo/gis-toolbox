import {
    parseCombinedCoordinate,
    parseCombinedStationOffset,
    parseCoordinateValue,
    parseOffsetValue,
    parseStationValue,
    normalizeSide
} from './station-table-parse.js';

const HEADER_PATTERNS = {
    station: /\b(sta|station|stationing|alignment station|location|loc|milepoint|mp|chainage|begin station|end station|from station|to station)\b/i,
    offset: /\b(offset|off|offset ft|offset feet|distance from centerline|dist from cl|cl offset)\b/i,
    side: /\b(side|lt rt|left right|offset side)\b/i,
    latitude: /\b(lat|latitude|gps lat|gps latitude|point lat|decimal latitude|y)\b/i,
    longitude: /\b(lon|long|longitude|gps lon|gps long|gps longitude|point long|decimal longitude|x)\b/i,
    label: /\b(name|label|desc|description|asset|asset id|its ref|its_ref|ref|id)\b/i
};

function valuesFor(rows, field, sampleSize = 100) {
    return (rows || []).slice(0, sampleSize).map((row) => row?.[field]).filter((v) => v != null && String(v).trim() !== '');
}

function scoreByValues(values, scorer) {
    if (!values.length) return 0;
    const matches = values.filter((value) => scorer(value)).length;
    return matches / values.length;
}

function confidence(headerScore, valueScore) {
    return Math.round(Math.min(1, headerScore * 0.45 + valueScore * 0.55) * 100);
}

function bestColumn(columns, rows, kind, valueScorer) {
    let best = { field: '', confidence: 0, headerScore: 0, valueScore: 0 };
    for (const field of columns || []) {
        const normalizedField = String(field).replace(/[_-]+/g, ' ');
        const headerScore = HEADER_PATTERNS[kind]?.test(normalizedField) ? 1 : 0;
        const valueScore = scoreByValues(valuesFor(rows, field), valueScorer);
        const conf = confidence(headerScore, valueScore);
        if (conf > best.confidence) best = { field, confidence: conf, headerScore, valueScore };
    }
    return best;
}

export function scoreStationColumn(field, values = []) {
    return confidence(HEADER_PATTERNS.station.test(field) ? 1 : 0, scoreByValues(values, (v) =>
        parseStationValue(v).valid || parseCombinedStationOffset(v).station.valid
    ));
}

export function scoreOffsetColumn(field, values = []) {
    return confidence(HEADER_PATTERNS.offset.test(field) ? 1 : 0, scoreByValues(values, (v) =>
        parseOffsetValue(v).valid
    ));
}

export function scoreSideColumn(field, values = []) {
    return confidence(HEADER_PATTERNS.side.test(field) ? 1 : 0, scoreByValues(values, (v) =>
        Boolean(normalizeSide(v))
    ));
}

export function analyzeOffsetEmbeddedSide(values = []) {
    if (!values.length) {
        return { includesSide: false, sideCount: 0, valueCount: 0, pct: 0 };
    }
    let sideCount = 0;
    for (const value of values) {
        const parsed = parseOffsetValue(String(value ?? ''));
        if (parsed.valid && parsed.offsetSide && parsed.offsetSide !== 'CL') {
            sideCount += 1;
        }
    }
    const valueCount = values.length;
    return {
        includesSide: sideCount > 0,
        sideCount,
        valueCount,
        pct: Math.round((sideCount / valueCount) * 100)
    };
}

export function getOffsetEmbeddedSideForMapping(rows = [], offsetField = '') {
    if (!offsetField) {
        return { includesSide: false, sideCount: 0, valueCount: 0, pct: 0, offsetField: '' };
    }
    return {
        ...analyzeOffsetEmbeddedSide(valuesFor(rows, offsetField)),
        offsetField
    };
}

export function scoreLatitudeColumn(field, values = []) {
    return confidence(HEADER_PATTERNS.latitude.test(field) ? 1 : 0, scoreByValues(values, (v) => {
        const n = Number(v);
        return Number.isFinite(n) && Math.abs(n) <= 90;
    }));
}

export function scoreLongitudeColumn(field, values = []) {
    return confidence(HEADER_PATTERNS.longitude.test(field) ? 1 : 0, scoreByValues(values, (v) => {
        const n = Number(v);
        return Number.isFinite(n) && Math.abs(n) <= 180;
    }));
}

export function detectStationTableColumns(rows = [], columns = null) {
    const fields = columns || (rows[0] ? Object.keys(rows[0]) : []);
    const station = bestColumn(fields, rows, 'station', (v) =>
        parseStationValue(v).valid || parseCombinedStationOffset(v).station.valid
    );
    const offset = bestColumn(fields, rows, 'offset', (v) => parseOffsetValue(v).valid);
    const side = bestColumn(fields, rows, 'side', (v) => Boolean(normalizeSide(v)));
    const latitude = bestColumn(fields, rows, 'latitude', (v) => {
        const n = Number(v);
        return Number.isFinite(n) && Math.abs(n) <= 90;
    });
    const longitude = bestColumn(fields, rows, 'longitude', (v) => {
        const n = Number(v);
        return Number.isFinite(n) && Math.abs(n) <= 180;
    });
    const label = bestColumn(fields, rows, 'label', (v) => String(v ?? '').trim().length > 0);
    const combinedCoordinate = bestColumn(fields, rows, 'latitude', (v) => parseCombinedCoordinate(v).valid);
    const offsetEmbeddedSide = getOffsetEmbeddedSideForMapping(rows, offset.field);

    return {
        fields,
        station,
        offset,
        side,
        latitude,
        longitude,
        label,
        combinedCoordinate,
        offsetEmbeddedSide,
        hasUsableStation: station.confidence >= 50,
        hasUsableCoordinates: (latitude.confidence >= 50 && longitude.confidence >= 50) || combinedCoordinate.confidence >= 60
    };
}

function mappedField(detection, key, minConfidence = 50) {
    const item = detection?.[key];
    if (!item?.field || (item.confidence ?? 0) < minConfidence) return '';
    return item.field;
}

export function normalizeColumnMapping(detection = {}, overrides = {}) {
    return {
        station: overrides.station ?? mappedField(detection, 'station'),
        offset: overrides.offset ?? mappedField(detection, 'offset'),
        side: overrides.side ?? mappedField(detection, 'side'),
        latitude: overrides.latitude ?? mappedField(detection, 'latitude'),
        longitude: overrides.longitude ?? mappedField(detection, 'longitude'),
        combinedCoordinate: overrides.combinedCoordinate ?? mappedField(detection, 'combinedCoordinate', 60),
        label: overrides.label ?? mappedField(detection, 'label')
    };
}

export function summarizeDetection(detection = {}) {
    return [
        ['Station', detection.station],
        ['Offset', detection.offset],
        ['Side', detection.side],
        ['Latitude', detection.latitude],
        ['Longitude', detection.longitude],
        ['Label', detection.label]
    ].map(([label, result]) => ({
        label,
        field: result?.field || '',
        confidence: result?.confidence || 0
    }));
}

import { formatStation, parseStation } from '../engine.js';

export const STATIONING_STATUS = {
    READY: 'Ready',
    WARNING: 'Warning',
    NEEDS_REVIEW: 'Needs Review',
    OUTSIDE_ROUTE: 'Outside Route',
    COORDINATE_CONFLICT: 'Coordinate Conflict',
    UNPLOTTED: 'Unplotted',
    SKIPPED: 'Skipped'
};

export const ERROR_CODES = {
    MISSING_STATION: 'MISSING_STATION',
    INVALID_STATION_FORMAT: 'INVALID_STATION_FORMAT',
    AMBIGUOUS_STATION_FORMAT: 'AMBIGUOUS_STATION_FORMAT',
    STATION_RANGE_NOT_SUPPORTED: 'STATION_RANGE_NOT_SUPPORTED',
    STATION_OUTSIDE_ROUTE: 'STATION_OUTSIDE_ROUTE',
    MISSING_OFFSET_DEFAULTED: 'MISSING_OFFSET_DEFAULTED',
    INVALID_OFFSET_FORMAT: 'INVALID_OFFSET_FORMAT',
    OFFSET_SIDE_CONFLICT: 'OFFSET_SIDE_CONFLICT',
    UNKNOWN_SIDE_VALUE: 'UNKNOWN_SIDE_VALUE',
    MISSING_COORDINATES: 'MISSING_COORDINATES',
    INVALID_COORDINATE_FORMAT: 'INVALID_COORDINATE_FORMAT',
    PROJECTED_COORDINATES_NEED_CRS: 'PROJECTED_COORDINATES_NEED_CRS',
    COORDINATE_FAR_FROM_ROUTE: 'COORDINATE_FAR_FROM_ROUTE',
    STATION_COORDINATE_WARNING: 'STATION_COORDINATE_WARNING',
    STATION_COORDINATE_CONFLICT: 'STATION_COORDINATE_CONFLICT',
    MISSING_LOCATION: 'MISSING_LOCATION'
};

const STATION_RANGE_RE = /(\d+\s*[+\-]\s*\d+(?:\.\d+)?)\s*(?:to|through|-|–|—)\s*(\d+\s*[+\-]\s*\d+(?:\.\d+)?)/i;
const STATION_RE = /(?:sta(?:tion)?\.?\s*)?(\d+)\s*\+\s*(\d+(?:\.\d+)?)/i;
const RISKY_STATION_DASH_RE = /^\s*(\d+)\s*-\s*(\d+(?:\.\d+)?)\s*$/;
const COMBINED_COORD_RE = /(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/;

function clean(value) {
    return String(value ?? '').trim();
}

export function parseStationValue(raw, options = {}) {
    const input = clean(raw);
    if (!input) {
        return { valid: false, raw: input, errorCode: ERROR_CODES.MISSING_STATION, warning: 'Missing station.' };
    }

    if (STATION_RANGE_RE.test(input)) {
        return {
            valid: false,
            raw: input,
            errorCode: ERROR_CODES.STATION_RANGE_NOT_SUPPORTED,
            warning: 'Station range detected; line events are not supported in this version.'
        };
    }

    const safe = input
        .replace(/,/g, '')
        .replace(/\bsta(?:tion)?\.?\b/ig, '')
        .replace(/\s+/g, ' ')
        .trim();
    const match = safe.match(STATION_RE);
    if (match) {
        const station = parseStation(`${match[1]}+${match[2]}`);
        if (station == null) {
            return { valid: false, raw: input, errorCode: ERROR_CODES.INVALID_STATION_FORMAT, warning: `The station value "${input}" could not be read.` };
        }
        return {
            valid: true,
            raw: input,
            stationFeet: station,
            stationLabel: formatStation(station),
            warnings: safe !== input ? ['Station text was normalized.'] : []
        };
    }

    const riskyDash = safe.match(RISKY_STATION_DASH_RE);
    if (riskyDash) {
        const station = parseStation(`${riskyDash[1]}+${riskyDash[2]}`);
        return {
            valid: Boolean(options.allowRiskyCorrections && station != null),
            raw: input,
            stationFeet: station,
            stationLabel: station != null ? formatStation(station) : '',
            errorCode: ERROR_CODES.AMBIGUOUS_STATION_FORMAT,
            warning: `The station value "${input}" looks like a station but needs review.`
        };
    }

    if (/^\d+(\.\d+)?$/.test(safe)) {
        const station = Number(safe);
        return {
            valid: options.plainNumberIsFeet === true,
            raw: input,
            stationFeet: station,
            stationLabel: formatStation(station),
            errorCode: options.plainNumberIsFeet ? null : ERROR_CODES.AMBIGUOUS_STATION_FORMAT,
            warning: options.plainNumberIsFeet
                ? ''
                : `The station value "${input}" is a plain number and needs review.`
        };
    }

    return { valid: false, raw: input, errorCode: ERROR_CODES.INVALID_STATION_FORMAT, warning: `The station value "${input}" could not be read.` };
}

export function normalizeSide(raw) {
    const value = clean(raw).toUpperCase();
    if (!value) return '';
    if (['RT', 'R', 'RIGHT'].includes(value)) return 'RT';
    if (['LT', 'L', 'LEFT'].includes(value)) return 'LT';
    if (['CL', 'C', 'CENTER', 'CENTRE', 'CENTERLINE', 'ON CENTERLINE'].includes(value)) return 'CL';
    return '';
}

export function parseOffsetValue(raw, sideRaw = '', options = {}) {
    const input = clean(raw);
    const sideFromColumn = normalizeSide(sideRaw);
    if (!input && !sideFromColumn) {
        return {
            valid: true,
            raw: input,
            offsetFeet: 0,
            offsetSide: 'CL',
            status: 'missing_defaulted_to_centerline',
            warnings: [ERROR_CODES.MISSING_OFFSET_DEFAULTED]
        };
    }

    const upper = input.toUpperCase().replace(/'/g, '').replace(/\bFEET\b|\bFT\b/g, '').trim();
    if (['', '0', 'CL', 'CENTER', 'CENTERLINE'].includes(upper)) {
        return { valid: true, raw: input, offsetFeet: 0, offsetSide: 'CL', warnings: [] };
    }

    const sideInValue = normalizeSide((upper.match(/\b(RT|LT|RIGHT|LEFT|R|L)\b/) || [])[1])
        || normalizeSide((upper.match(/^([RL])\s*\d/) || [])[1])
        || normalizeSide((upper.match(/\d\s*([RL])$/) || [])[1]);
    const numMatch = upper.match(/[+-]?\d+(?:\.\d+)?/);
    if (!numMatch) {
        return { valid: false, raw: input, errorCode: ERROR_CODES.INVALID_OFFSET_FORMAT, warning: `The offset value "${input}" could not be converted to feet.` };
    }

    const signed = Number(numMatch[0]);
    let side = sideFromColumn || sideInValue;
    const signSide = signed < 0 ? (options.positiveOffsetMeans === 'left' ? 'RT' : 'LT') : (options.positiveOffsetMeans === 'left' ? 'LT' : 'RT');
    const conflict = Boolean(sideFromColumn && signSide !== 'CL' && sideFromColumn !== 'CL' && sideFromColumn !== signSide && signed !== 0);
    if (!side) side = signSide;
    if (Math.abs(signed) === 0) side = 'CL';

    return {
        valid: true,
        raw: input,
        offsetFeet: Math.abs(signed),
        offsetSide: side,
        warnings: conflict ? [ERROR_CODES.OFFSET_SIDE_CONFLICT] : []
    };
}

export function parseCoordinateValue(latRaw, lonRaw) {
    const lat = Number(clean(latRaw));
    const lon = Number(clean(lonRaw));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return { valid: false, errorCode: ERROR_CODES.INVALID_COORDINATE_FORMAT };
    }
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return { valid: false, projectedLike: true, errorCode: ERROR_CODES.INVALID_COORDINATE_FORMAT };
    }
    return { valid: true, latitude: lat, longitude: lon };
}

export function parseCombinedCoordinate(raw) {
    const text = clean(raw).replace(/^POINT\s*\(/i, '').replace(/\)$/g, '');
    const match = text.match(COMBINED_COORD_RE);
    if (!match) return { valid: false };
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return parseCoordinateValue(a, b);
    if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return parseCoordinateValue(b, a);
    return { valid: false, projectedLike: true };
}

export function parseCombinedStationOffset(raw, options = {}) {
    const input = clean(raw);
    const station = parseStationValue(input, options);
    const stationMatch = input.match(STATION_RE);
    const remainder = stationMatch
        ? input.replace(stationMatch[0], ' ').replace(/\s+/g, ' ').trim()
        : '';
    const offset = parseOffsetValue(remainder, '', options);
    return { station, offset, raw: input };
}

export function stationToDistanceAlongRoute(stationFeet, routeStartFeet) {
    return Number(stationFeet) - Number(routeStartFeet);
}

export function distanceAlongRouteToStation(distanceAlongRoute, routeStartFeet) {
    return Number(routeStartFeet) + Number(distanceAlongRoute);
}

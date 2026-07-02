/**
 * Shared coordinate column detection for tabular imports.
 */
import { dmsToDd } from '../tools/coordinates.js';
import { looksProjected } from '../crs/detect.js';

/** Parse a coordinate value — handles DD numbers and DMS strings */
export function parseCoordValue(val) {
    if (val == null || val === '') return NaN;
    if (typeof val === 'number' && isFinite(val)) return val;
    const s = String(val).trim();
    const n = parseFloat(s);
    if (!isNaN(n) && /^-?\d+\.?\d*$/.test(s)) return n;
    const dms = dmsToDd(s);
    if (dms != null && isFinite(dms)) return dms;
    return n;
}

const LAT_PATTERNS = ['lat', 'latitude', 'lat_dd', 'latitude_dd', 'y'];
const LON_PATTERNS = ['lon', 'lng', 'long', 'longitude', 'lon_dd', 'longitude_dd', 'x'];
const EASTING_PATTERNS = ['easting', 'eastings', 'east', 'x'];
const NORTHING_PATTERNS = ['northing', 'northings', 'north', 'y'];

/** Normalize column header for pattern matching */
function normalizeFieldName(field) {
    return String(field).toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function compactFieldName(field) {
    return normalizeFieldName(field).replace(/\s+/g, '');
}

function fieldMatchesPatterns(field, patterns) {
    const norm = normalizeFieldName(field);
    const compact = compactFieldName(field);
    for (const p of patterns) {
        const pn = normalizeFieldName(p);
        const pc = compactFieldName(p);
        if (norm === pn || compact === pc) return true;
        if (pn.length >= 4 && (norm.includes(pn) || compact.includes(pc))) return true;
    }
    return false;
}

function _findField(fields, patterns) {
    for (const f of fields) {
        const norm = normalizeFieldName(f);
        const compact = compactFieldName(f);
        for (const p of patterns) {
            const pn = normalizeFieldName(p);
            const pc = compactFieldName(p);
            if (norm === pn || compact === pc) return f;
        }
    }
    for (const f of fields) {
        if (fieldMatchesPatterns(f, patterns.filter((p) => normalizeFieldName(p).length >= 4))) return f;
    }
    for (const f of fields) {
        const compact = compactFieldName(f);
        for (const p of patterns) {
            const pc = compactFieldName(p);
            if (pc.length <= 2 && compact === pc) return f;
        }
    }
    return null;
}

function _sampleValidCount(rows, xField, yField, validator) {
    const sample = rows.slice(0, 20);
    if (!sample.length) return 0;
    return sample.filter((r) => {
        const x = parseCoordValue(r[xField]);
        const y = parseCoordValue(r[yField]);
        return validator(x, y);
    }).length;
}

function _isExplicitEastingField(field) {
    return /easting|eastings/.test(compactFieldName(field));
}

function _isExplicitNorthingField(field) {
    return /northing|northings/.test(compactFieldName(field));
}

/**
 * Classify a column name as a coordinate role, if recognized.
 * @param {string} name
 * @returns {'latitude'|'longitude'|'northing'|'easting'|null}
 */
export function classifyCoordinateField(name) {
    if (!name) return null;
    if (_isExplicitEastingField(name)) return 'easting';
    if (_isExplicitNorthingField(name)) return 'northing';

    const norm = normalizeFieldName(name);
    const compact = compactFieldName(name);

    if (/\b(lat|latitude)\b/.test(norm) || compact === 'lat') return 'latitude';
    if (/\b(lon|lng|long|longitude)\b/.test(norm) || compact === 'lon' || compact === 'lng') return 'longitude';
    if (compact === 'x') return 'easting';
    if (compact === 'y') return 'northing';
    if (/\bpoint x\b/.test(norm) || /\bcoord x\b/.test(norm)) return 'easting';
    if (/\bpoint y\b/.test(norm) || /\bcoord y\b/.test(norm)) return 'northing';
    if (/\butm easting\b/.test(norm)) return 'easting';
    if (/\butm northing\b/.test(norm)) return 'northing';

    return null;
}

/** @param {string} name */
export function isCoordinateFieldName(name) {
    return classifyCoordinateField(name) != null;
}

/**
 * Guess lat/Y and lon/X fields from column names (for tools and wizards).
 * @param {string[]} fields
 * @returns {{ latField: string, lonField: string }}
 */
export function guessCoordinateFields(fields = []) {
    let latField = '';
    let lonField = '';

    for (const f of fields) {
        const role = classifyCoordinateField(f);
        if ((role === 'northing' || role === 'latitude') && !latField) latField = f;
        if ((role === 'easting' || role === 'longitude') && !lonField) lonField = f;
    }

    if (!latField) {
        latField = fields.find((f) => /^(lat|latitude|y|northing)$/i.test(f)) || '';
    }
    if (!lonField) {
        lonField = fields.find((f) => /^(lon|lng|longitude|long|x|easting)$/i.test(f)) || '';
    }

    return { latField, lonField };
}

/**
 * Detect geographic lat/lon columns (WGS84-like ranges).
 * @param {string[]} fields
 * @param {object[]} rows
 * @returns {{ latField: string, lonField: string, projected?: boolean }|null}
 */
export function detectCoordinateColumns(fields, rows) {
    const latField = _findField(fields, LAT_PATTERNS);
    const lonField = _findField(fields, LON_PATTERNS);
    if (!latField || !lonField || latField === lonField) return null;

    // Explicit easting/northing headers are handled by projected detection.
    if (_isExplicitEastingField(latField) || _isExplicitNorthingField(lonField)) return null;
    if (_isExplicitEastingField(lonField) || _isExplicitNorthingField(latField)) return null;

    const validCount = _sampleValidCount(rows, lonField, latField, (lon, lat) =>
        !isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    );

    if (validCount >= Math.max(1, rows.slice(0, 20).length * 0.5)) {
        return { latField, lonField, projected: false };
    }
    return null;
}

/**
 * Detect easting/northing columns by header name and numeric values.
 * @param {string[]} fields
 * @param {object[]} rows
 * @returns {{ xField: string, yField: string, projected: true, latField: string, lonField: string }|null}
 */
export function detectEastingNorthingColumns(fields, rows) {
    const eastingField = _findField(fields, EASTING_PATTERNS);
    const northingField = _findField(fields, NORTHING_PATTERNS);
    if (!eastingField || !northingField || eastingField === northingField) return null;

    const explicitPair = _isExplicitEastingField(eastingField) && _isExplicitNorthingField(northingField);
    const validCount = _sampleValidCount(rows, eastingField, northingField, (x, y) =>
        !isNaN(x) && !isNaN(y)
    );
    const sampleLen = Math.max(1, rows.slice(0, 20).length);
    if (validCount < sampleLen * 0.5) return null;

    const sample = rows.slice(0, 20);
    const looksProjectedSample = sample.some((r) => {
        const x = parseCoordValue(r[eastingField]);
        const y = parseCoordValue(r[northingField]);
        return looksProjected(x, y);
    });

    if (!explicitPair && !looksProjectedSample) return null;

    return {
        xField: eastingField,
        yField: northingField,
        projected: true,
        latField: northingField,
        lonField: eastingField
    };
}

/**
 * Detect projected X/Y columns when geographic detection fails.
 * @param {string[]} fields
 * @param {object[]} rows
 * @returns {{ xField: string, yField: string, projected: true, latField: string, lonField: string }|null}
 */
export function detectProjectedColumns(fields, rows) {
    const eastingNorthing = detectEastingNorthingColumns(fields, rows);
    if (eastingNorthing) return eastingNorthing;

    const xField = _findField(fields, ['x', 'easting', 'east', 'lon', 'longitude']);
    const yField = _findField(fields, ['y', 'northing', 'north', 'lat', 'latitude']);
    if (!xField || !yField || xField === yField) return null;

    const projectedCount = _sampleValidCount(rows, xField, yField, (x, y) =>
        !isNaN(x) && !isNaN(y) && looksProjected(x, y)
    );
    const sampleLen = Math.max(1, rows.slice(0, 20).length);

    if (projectedCount >= sampleLen * 0.5) {
        return { xField, yField, projected: true, latField: yField, lonField: xField };
    }
    return null;
}

/**
 * Try geographic first, then projected column detection.
 */
export function detectAnyCoordinateColumns(fields, rows) {
    return detectCoordinateColumns(fields, rows) || detectProjectedColumns(fields, rows);
}

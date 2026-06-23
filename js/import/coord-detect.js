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

const LAT_PATTERNS = ['lat', 'latitude', 'y', 'lat_dd', 'latitude_dd'];
const LON_PATTERNS = ['lon', 'lng', 'long', 'longitude', 'x', 'lon_dd', 'longitude_dd'];

function _findField(fields, patterns) {
    const lower = fields.map((f) => f.toLowerCase());
    for (const p of patterns) {
        const idx = lower.findIndex((f) => f === p || f === p.replace('_', ''));
        if (idx >= 0) return fields[idx];
    }
    return null;
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
    if (!latField || !lonField) return null;

    const sample = rows.slice(0, 20);
    const validCount = sample.filter((r) => {
        const lat = parseCoordValue(r[latField]);
        const lon = parseCoordValue(r[lonField]);
        return !isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    }).length;

    if (validCount >= sample.length * 0.5) {
        return { latField, lonField, projected: false };
    }
    return null;
}

/**
 * Detect projected X/Y columns when geographic detection fails.
 * @param {string[]} fields
 * @param {object[]} rows
 * @returns {{ xField: string, yField: string, projected: true }|null}
 */
export function detectProjectedColumns(fields, rows) {
    const xField = _findField(fields, ['x', 'easting', 'east', 'lon', 'longitude']);
    const yField = _findField(fields, ['y', 'northing', 'north', 'lat', 'latitude']);
    if (!xField || !yField || xField === yField) return null;

    const sample = rows.slice(0, 20);
    const projectedCount = sample.filter((r) => {
        const x = parseCoordValue(r[xField]);
        const y = parseCoordValue(r[yField]);
        return !isNaN(x) && !isNaN(y) && looksProjected(x, y);
    }).length;

    if (projectedCount >= Math.max(1, sample.length * 0.5)) {
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

/**
 * CRS detection helpers.
 */
import { normalizeCrsCode, listPresetCrs } from './registry.js';

const DISPLAY_READY_CODES = new Set(['EPSG:4326', 'EPSG:4269', 'EPSG:4258']);

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function looksProjected(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return Math.abs(x) > 180 || Math.abs(y) > 90;
}

/**
 * @param {string|null|undefined} crs
 * @returns {boolean}
 */
export function isDisplayReady(crs) {
    if (!crs || crs === 'UNKNOWN') return false;
    const normalized = normalizeCrsCode(crs);
    return DISPLAY_READY_CODES.has(normalized);
}

/**
 * @param {string} wkt
 * @returns {{ wkt: string, epsg: string|null, label: string|null }}
 */
export function parsePrjWkt(wkt) {
    const trimmed = String(wkt || '').trim();
    if (!trimmed) {
        return { wkt: '', epsg: null, label: null };
    }

    const epsg = wktToEpsg(trimmed);
    return {
        wkt: trimmed,
        epsg,
        label: epsg ? listPresetCrs().find((p) => p.code === epsg)?.label || epsg : null
    };
}

/**
 * Best-effort match WKT to a known EPSG preset.
 * @param {string} wkt
 * @returns {string|null}
 */
export function wktToEpsg(wkt) {
    const text = String(wkt || '').toUpperCase();
    if (!text) return null;

    if (text.includes('WGS_1984') && text.includes('GEOGCS') && !text.includes('PROJCS')) {
        return 'EPSG:4326';
    }
    if (text.includes('GCS_NAD_1983') || (text.includes('NAD83') && text.includes('GEOGCS'))) {
        return 'EPSG:4269';
    }
    if (text.includes('NAVD88') || text.includes('NAVD_88')) {
        if (/UTM.*ZONE[_\s]*12/i.test(text)) return 'EPSG:6337';
        if (/UTM.*ZONE[_\s]*11/i.test(text)) return 'EPSG:6336';
        if (/UTM.*ZONE[_\s]*13/i.test(text)) return 'EPSG:6338';
    }
    if (/UTM.*ZONE[_\s]*12/i.test(text)) {
        return text.includes('2011') ? 'EPSG:6337' : 'EPSG:26912';
    }
    if (/UTM.*ZONE[_\s]*11/i.test(text)) {
        return 'EPSG:26911';
    }
    if (/UTM.*ZONE[_\s]*13/i.test(text)) {
        return 'EPSG:26913';
    }
    if (text.includes('UTAH') && text.includes('NORTH')) {
        return 'EPSG:6610';
    }
    if (text.includes('UTAH') && text.includes('CENTRAL')) {
        return 'EPSG:6611';
    }
    if (text.includes('UTAH') && text.includes('SOUTH')) {
        return 'EPSG:6612';
    }
    if (text.includes('WEB MERCATOR') || text.includes('WGS_1984_WEB_MERCATOR')) {
        return 'EPSG:3857';
    }

    const authMatch = text.match(/AUTHORITY\["EPSG","(\d+)"\]/);
    if (authMatch) {
        return `EPSG:${authMatch[1]}`;
    }

    return null;
}

/**
 * Build a human-readable CRS warning for non-display-ready layers.
 * @param {string} crs
 * @returns {string}
 */
export function buildCrsWarning(crs) {
    const code = normalizeCrsCode(crs);
    if (isDisplayReady(code)) return '';
    if (code === 'UNKNOWN') {
        return 'Coordinates appear projected but CRS is unknown. Reproject to WGS84 (EPSG:4326) for map display.';
    }
    return `This layer uses ${code}. Reproject to WGS84 (EPSG:4326) for map display.`;
}

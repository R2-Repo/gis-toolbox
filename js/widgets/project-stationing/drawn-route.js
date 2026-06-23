import { listLineStringFeatures } from '../../tools/line-geojson.js';
import { calculateGeometryHash } from './route-profile.js';

const DEFAULT_MIN_LENGTH_FT = 100;

export const ROUTE_SOURCE_DRAWN = 'drawn';
export const ROUTE_SOURCE_IMPORTED = 'imported';

export const CUSTOM_ROUTE_SOURCES = [ROUTE_SOURCE_DRAWN, ROUTE_SOURCE_IMPORTED];

/**
 * @param {string} source
 * @returns {boolean}
 */
export function isCustomRouteSource(source) {
    return CUSTOM_ROUTE_SOURCES.includes(source);
}

function lineLengthFeet(line) {
    if (typeof turf === 'undefined' || !line?.geometry) return 0;
    return turf.length(line, { units: 'feet' });
}

/**
 * @param {import('geojson').Feature<import('geojson').LineString>[]} lines
 * @returns {import('geojson').Feature<import('geojson').LineString>|null}
 */
function pickLongestLine(lines) {
    if (!lines?.length) return null;
    return lines.reduce((best, current) => {
        if (!best) return current;
        return lineLengthFeet(current) > lineLengthFeet(best) ? current : best;
    }, null);
}

/**
 * Pick the longest line from a layer feature collection (MultiLineString segments included).
 * @param {import('geojson').FeatureCollection} geojson
 * @param {{ minLengthFt?: number }} [options]
 */
export function resolveCenterlineFromLayer(geojson, options = {}) {
    const minLengthFt = Number(options.minLengthFt) || DEFAULT_MIN_LENGTH_FT;
    const lines = listLineStringFeatures(geojson);
    if (!lines.length) {
        return { ok: false, error: 'No line features found in the selected layer.' };
    }

    const warnings = [];
    const longest = pickLongestLine(lines);
    if (!longest?.geometry || longest.geometry.type !== 'LineString') {
        return { ok: false, error: 'No line features found in the selected layer.' };
    }

    const coords = longest.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
        return { ok: false, error: 'Line must have at least two vertices.' };
    }

    const lineLengthFt = lineLengthFeet(longest);
    if (lineLengthFt < minLengthFt) {
        return {
            ok: false,
            error: `Centerline must be at least ${minLengthFt} ft long (selected line is ${Math.round(lineLengthFt)} ft).`
        };
    }

    if (lines.length > 1) {
        warnings.push(
            `Layer has ${lines.length} line segments; using the longest (${Math.round(lineLengthFt).toLocaleString()} ft).`
        );
    }

    return {
        ok: true,
        line: longest,
        lineLengthFt,
        warnings
    };
}

/**
 * Build a synthetic route context from a user centerline (drawn or imported; no ArcGIS route layer).
 * @param {import('geojson').Feature<import('geojson').LineString>} lineFeature
 * @param {{ routeName?: string, travelDirection?: string, sourceLayerId?: string }} meta
 * @param {string} [source]
 */
export function buildCustomRouteContext(lineFeature, meta = {}, source = ROUTE_SOURCE_DRAWN) {
    const routeName = String(meta.routeName ?? '').trim();
    if (!routeName) {
        return { ok: false, error: 'Route name is required.' };
    }

    const geometry = lineFeature?.geometry;
    if (!geometry || geometry.type !== 'LineString') {
        return { ok: false, error: 'A valid line geometry is required.' };
    }

    const coords = geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
        const vertexMsg = source === ROUTE_SOURCE_DRAWN
            ? 'Draw at least two points for the centerline.'
            : 'Line must have at least two vertices.';
        return { ok: false, error: vertexMsg };
    }

    const travelDirection = String(meta.travelDirection ?? '').trim().toUpperCase();
    const sourceLayerId = meta.sourceLayerId ? String(meta.sourceLayerId) : undefined;
    const geometryHash = calculateGeometryHash(geometry);
    const positiveLine = {
        type: 'Feature',
        geometry,
        properties: {
            source,
            route_name: routeName,
            travel_direction: travelDirection,
            ...(sourceLayerId ? { source_layer_id: sourceLayerId } : {})
        }
    };

    return {
        ok: true,
        source,
        routeId: `${source}-${geometryHash}`,
        routeAlias: routeName,
        routeLabel: routeName,
        routeRecord: {
            source,
            route_name: routeName,
            travel_direction: travelDirection,
            ...(sourceLayerId ? { source_layer_id: sourceLayerId } : {})
        },
        routeSelection: {
            positiveLine,
            negativeLine: null,
            warnings: []
        }
    };
}

/**
 * @param {import('geojson').Feature<import('geojson').LineString>} lineFeature
 * @param {{ routeName?: string, travelDirection?: string }} meta
 */
export function buildDrawnRouteContext(lineFeature, meta = {}) {
    return buildCustomRouteContext(lineFeature, meta, ROUTE_SOURCE_DRAWN);
}

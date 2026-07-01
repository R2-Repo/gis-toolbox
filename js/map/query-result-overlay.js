/**
 * Temporary multi-feature query result overlay (amber) — separate from popup highlight and selection.
 */

const QUERY_SRC = 'query-result-source';
const QUERY_LAYER_IDS = [
    'query-result-fill',
    'query-result-outline',
    'query-result-line',
    'query-result-circle'
];
const QUERY_COLOR = '#fbbf24';

function geomTypesFilter(types) {
    return ['in', ['geometry-type'], ['literal', types]];
}

function resolveFeatureIndex(feature, fallbackIndex) {
    const idx = feature?.properties?._featureIndex;
    return Number.isInteger(idx) ? idx : fallbackIndex;
}

/**
 * @param {Map<string, object>} dataLayers
 * @param {string} layerId
 * @param {number[]} indices
 * @returns {object[]}
 */
export function buildQueryResultFeatures(dataLayers, layerId, indices = []) {
    const info = dataLayers?.get?.(layerId);
    if (!info?.geojson?.features?.length || !indices.length) return [];

    const indexSet = new Set(indices);
    return info.geojson.features.filter((feature, index) =>
        indexSet.has(resolveFeatureIndex(feature, index))
    );
}

/**
 * @param {import('maplibre-gl').Map} map
 */
export function removeQueryResultLayers(map) {
    if (!map) return;
    for (const lid of QUERY_LAYER_IDS) {
        if (map.getLayer(lid)) map.removeLayer(lid);
    }
    if (map.getSource(QUERY_SRC)) map.removeSource(QUERY_SRC);
}

/**
 * @param {import('maplibre-gl').Map} map
 * @param {object[]} features
 */
export function renderQueryResultLayers(map, features = []) {
    if (!map) return;
    removeQueryResultLayers(map);
    if (!features.length) return;

    map.addSource(QUERY_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features }
    });

    const hasPoint = features.some((f) => {
        const t = f.geometry?.type;
        return t === 'Point' || t === 'MultiPoint';
    });
    const hasLine = features.some((f) => {
        const t = f.geometry?.type;
        return t === 'LineString' || t === 'MultiLineString';
    });
    const hasPoly = features.some((f) => {
        const t = f.geometry?.type;
        return t === 'Polygon' || t === 'MultiPolygon';
    });

    if (hasPoly) {
        map.addLayer({
            id: 'query-result-fill',
            type: 'fill',
            source: QUERY_SRC,
            filter: geomTypesFilter(['Polygon', 'MultiPolygon']),
            paint: { 'fill-color': QUERY_COLOR, 'fill-opacity': 0.35 }
        });
        map.addLayer({
            id: 'query-result-outline',
            type: 'line',
            source: QUERY_SRC,
            filter: geomTypesFilter(['Polygon', 'MultiPolygon']),
            paint: { 'line-color': QUERY_COLOR, 'line-width': 4, 'line-opacity': 1 }
        });
    }
    if (hasLine) {
        map.addLayer({
            id: 'query-result-line',
            type: 'line',
            source: QUERY_SRC,
            filter: geomTypesFilter(['LineString', 'MultiLineString']),
            paint: { 'line-color': QUERY_COLOR, 'line-width': 4, 'line-opacity': 1 }
        });
    }
    if (hasPoint) {
        map.addLayer({
            id: 'query-result-circle',
            type: 'circle',
            source: QUERY_SRC,
            filter: geomTypesFilter(['Point', 'MultiPoint']),
            paint: {
                'circle-radius': 10,
                'circle-color': QUERY_COLOR,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 3,
                'circle-opacity': 1
            }
        });
    }
}

/**
 * @param {import('maplibre-gl').Map} map
 * @param {object} options
 * @param {'pulse'|'flash-once'} [options.mode]
 * @returns {() => void} cancel function
 */
export function startQueryResultPulse(map, { mode = 'pulse' } = {}) {
    if (!map) return () => {};

    const layerPaint = [
        { id: 'query-result-fill', props: ['fill-opacity'] },
        { id: 'query-result-outline', props: ['line-opacity'] },
        { id: 'query-result-line', props: ['line-opacity'] },
        { id: 'query-result-circle', props: ['circle-opacity', 'circle-radius'] }
    ];

    const baseValues = {
        'fill-opacity': 0.35,
        'line-opacity': 1,
        'circle-opacity': 1,
        'circle-radius': 10
    };

    const durationMs = mode === 'flash-once' ? 600 : 2400;
    const cycles = mode === 'flash-once' ? 1 : 3;
    const start = performance.now();
    let rafId = null;
    let cancelled = false;

    const setOpacity = (t) => {
        const pulse = 0.35 + 0.65 * Math.abs(Math.sin(t * Math.PI * 2 * cycles));
        for (const entry of layerPaint) {
            if (!map.getLayer(entry.id)) continue;
            for (const prop of entry.props) {
                if (prop === 'circle-radius') {
                    map.setPaintProperty(entry.id, prop, 8 + pulse * 6);
                } else {
                    map.setPaintProperty(entry.id, prop, baseValues[prop] * (0.4 + pulse * 0.6));
                }
            }
        }
    };

    const resetPaint = () => {
        for (const entry of layerPaint) {
            if (!map.getLayer(entry.id)) continue;
            for (const prop of entry.props) {
                map.setPaintProperty(entry.id, prop, baseValues[prop]);
            }
        }
    };

    const tick = (now) => {
        if (cancelled) return;
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs);
        setOpacity(t);
        if (t < 1) {
            rafId = requestAnimationFrame(tick);
        } else {
            resetPaint();
        }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
        cancelled = true;
        if (rafId) cancelAnimationFrame(rafId);
        resetPaint();
    };
}

/**
 * @param {Map<string, object>} dataLayers
 * @param {string} layerId
 * @param {number[]} indices
 * @param {'all'|'first'|'none'} [mode]
 * @returns {object[]|null} features used for bounds
 */
export function resolveFeaturesForZoom(dataLayers, layerId, indices = [], mode = 'all') {
    if (mode === 'none' || !indices.length) return null;
    const features = buildQueryResultFeatures(dataLayers, layerId, indices);
    if (!features.length) return null;
    if (mode === 'first') return [features[0]];
    return features;
}

/**
 * @param {import('maplibre-gl').Map} map
 * @param {object[]} features
 * @param {object} [options]
 */
export function fitMapToFeatures(map, features = [], options = {}) {
    if (!map || !features.length) return;

    const padding = options.padding ?? 48;
    const maxZoom = options.maxZoom ?? 16;

    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    let found = false;
    let pointCount = 0;
    let lineOrPolyCount = 0;

    for (const feature of features) {
        if (!feature?.geometry) continue;
        const type = feature.geometry.type;
        if (type === 'Point') {
            pointCount++;
            const [lng, lat] = feature.geometry.coordinates;
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
            found = true;
            if (lng < west) west = lng;
            if (lat < south) south = lat;
            if (lng > east) east = lng;
            if (lat > north) north = lat;
        } else {
            try {
                const bb = turf.bbox(feature);
                if (!bb || !isFinite(bb[0])) continue;
                found = true;
                if (type === 'LineString' || type === 'MultiLineString') lineOrPolyCount++;
                else lineOrPolyCount++;
                if (bb[0] < west) west = bb[0];
                if (bb[1] < south) south = bb[1];
                if (bb[2] > east) east = bb[2];
                if (bb[3] > north) north = bb[3];
            } catch {
                // skip invalid geometry
            }
        }
    }

    if (!found || !isFinite(west)) return;

    const isSinglePoint = pointCount === 1 && lineOrPolyCount === 0
        && Math.abs(west - east) < 1e-9 && Math.abs(south - north) < 1e-9;

    if (isSinglePoint) {
        const centerLng = (west + east) / 2;
        const centerLat = (south + north) / 2;
        const currentZoom = map.getZoom?.() ?? 10;
        const targetZoom = Math.min(maxZoom, Math.max(currentZoom, 14));
        map.flyTo({ center: [centerLng, centerLat], zoom: targetZoom, duration: 800 });
        return;
    }

    try {
        map.fitBounds([[west, south], [east, north]], { padding, maxZoom, duration: 800 });
    } catch {
        // ignore invalid bounds
    }
}

export { QUERY_LAYER_IDS, QUERY_SRC };

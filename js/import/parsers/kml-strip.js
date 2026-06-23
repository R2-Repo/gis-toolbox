/**
 * KML/KMZ GIS strip — remove presentation bloat before GeoJSON conversion.
 */

const STRIP_PROPERTY_KEYS = new Set([
    'description', 'Description', 'styleUrl', 'styleHash', 'styleMapHash',
    'icon', 'Icon', 'balloonStyle', 'BalloonStyle', 'visibility'
]);

/**
 * @param {import('geojson').FeatureCollection} geojson
 * @returns {import('geojson').FeatureCollection}
 */
export function stripKmlPresentationFromGeoJSON(geojson) {
    if (!geojson?.features) return geojson;
    return {
        ...geojson,
        features: geojson.features.map((f) => {
            const props = f.properties || {};
            const slim = {};
            for (const [k, v] of Object.entries(props)) {
                if (STRIP_PROPERTY_KEYS.has(k)) continue;
                if (k.startsWith('stroke') || k.startsWith('fill') || k.startsWith('marker-')) continue;
                if (typeof v === 'string' && v.length > 2000) continue;
                slim[k] = v;
            }
            if (slim.name == null && props.name != null) slim.name = props.name;
            return { ...f, properties: slim };
        })
    };
}

export default { stripKmlPresentationFromGeoJSON };

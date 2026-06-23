/**
 * Pure GeoJSON text parse — normalizes to FeatureCollection shape.
 * @param {string} text
 * @returns {{ geojson: object }}
 */
export function parseGeoJSONText(text) {
    const data = JSON.parse(text);
    let fc;
    if (data.type === 'FeatureCollection') {
        fc = data;
    } else if (data.type === 'Feature') {
        fc = { type: 'FeatureCollection', features: [data] };
    } else if (data.type && data.coordinates) {
        fc = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: data, properties: {} }] };
    } else {
        throw new Error('Not a recognized GeoJSON structure');
    }

    fc.features = (fc.features || []).map((f) => ({
        type: 'Feature',
        geometry: f.geometry || null,
        properties: f.properties || {},
        ...((f.id != null) ? { id: f.id } : {})
    }));

    return { geojson: fc };
}

export default parseGeoJSONText;

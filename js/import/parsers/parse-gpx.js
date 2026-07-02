/**
 * Parse GPX text to GeoJSON using injected XML parser and toGeoJSON lib.
 * @param {string} text
 * @param {{ DOMParserImpl: typeof DOMParser, toGeoJsonLib: object }} deps
 */
export function parseGpxText(text, deps) {
    const { DOMParserImpl, toGeoJsonLib } = deps;
    const parser = new DOMParserImpl();
    const gpxDoc = parser.parseFromString(text, 'text/xml');

    const parseError = gpxDoc.querySelector?.('parsererror')
        || gpxDoc.getElementsByTagName('parsererror')?.[0];
    if (parseError) {
        const detail = parseError.textContent?.slice(0, 200) || 'Invalid GPX/XML';
        throw new Error(detail);
    }

    const head = text.trim().slice(0, 8000);
    if (!/<gpx[\s/>]/i.test(head)) {
        throw new Error('This XML file does not appear to be GPX. Expected a root <gpx> element.');
    }

    if (!toGeoJsonLib?.gpx) {
        throw new Error('toGeoJSON library not loaded');
    }

    let geojson;
    try {
        geojson = toGeoJsonLib.gpx(gpxDoc);
    } catch (e) {
        throw new Error('Failed to convert GPX to GeoJSON: ' + e.message);
    }

    if (!geojson || !Array.isArray(geojson.features)) {
        geojson = { type: 'FeatureCollection', features: [] };
    }

    return { geojson };
}

export default parseGpxText;

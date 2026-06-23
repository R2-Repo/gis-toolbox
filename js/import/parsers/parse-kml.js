/**
 * Collect NetworkLink href strings from a KML document.
 * @param {Document} kmlDoc
 */
export function collectNetworkLinkHrefsFromDoc(kmlDoc) {
    const out = [];
    const seen = new Set();
    const networkLinks = kmlDoc.getElementsByTagName('NetworkLink');
    for (let i = 0; i < networkLinks.length; i++) {
        const nl = networkLinks[i];
        const links = nl.getElementsByTagName('Link');
        for (let j = 0; j < links.length; j++) {
            const link = links[j];
            const hrefEls = link.getElementsByTagName('href');
            for (let k = 0; k < hrefEls.length; k++) {
                const t = hrefEls[k].textContent?.trim();
                if (!t || seen.has(t)) continue;
                seen.add(t);
                out.push(t);
            }
        }
    }
    return out;
}

/**
 * Parse KML text to GeoJSON using injected XML parser and toGeoJSON lib.
 * @param {string} text
 * @param {{ DOMParserImpl: typeof DOMParser, toGeoJsonLib: object }} deps
 */
export function parseKmlText(text, deps) {
    const { DOMParserImpl, toGeoJsonLib } = deps;
    const parser = new DOMParserImpl();
    const kmlDoc = parser.parseFromString(text, 'text/xml');

    const parseError = kmlDoc.querySelector?.('parsererror')
        || kmlDoc.getElementsByTagName('parsererror')?.[0];
    if (parseError) {
        const detail = parseError.textContent?.slice(0, 200) || 'Invalid KML/XML';
        throw new Error(detail);
    }

    if (!toGeoJsonLib?.kml) {
        throw new Error('toGeoJSON library not loaded');
    }

    let geojson;
    try {
        geojson = toGeoJsonLib.kml(kmlDoc);
    } catch (e) {
        throw new Error('Failed to convert KML to GeoJSON: ' + e.message);
    }

    if (!geojson || !Array.isArray(geojson.features)) {
        geojson = { type: 'FeatureCollection', features: [] };
    }

    const networkHrefs = collectNetworkLinkHrefsFromDoc(kmlDoc);
    return { geojson, networkHrefs };
}

export default parseKmlText;

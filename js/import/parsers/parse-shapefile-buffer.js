/**
 * Extract .prj WKT text from a shapefile ZIP buffer.
 * @param {ArrayBuffer} buffer
 * @param {object} JSZipLib
 * @returns {Promise<string|null>}
 */
export async function extractPrjFromShapefileZip(buffer, JSZipLib) {
    if (!JSZipLib?.loadAsync) return null;
    let zip;
    try {
        zip = await JSZipLib.loadAsync(buffer);
    } catch {
        return null;
    }

    let prjText = null;
    zip.forEach((path, entry) => {
        if (entry.dir) return;
        if (path.toLowerCase().endsWith('.prj')) {
            prjText = path;
        }
    });

    if (!prjText) return null;
    try {
        const entry = zip.file(prjText);
        if (!entry) return null;
        return await entry.async('text');
    } catch {
        return null;
    }
}

/**
 * Parse shapefile ZIP buffer via shpjs.
 * @param {ArrayBuffer} buffer
 * @param {Function} shpFn
 * @param {object} [opts]
 * @param {object} [opts.JSZipLib]
 */
export async function parseShapefileBuffer(buffer, shpFn, opts = {}) {
    if (typeof shpFn !== 'function') {
        throw new Error('Shapefile (shpjs) library not loaded');
    }

    let prjWkt = null;
    if (opts.JSZipLib) {
        prjWkt = await extractPrjFromShapefileZip(buffer, opts.JSZipLib);
    }

    let geojson;
    try {
        geojson = await shpFn(buffer);
    } catch (e) {
        throw new Error('Failed to parse shapefile: ' + e.message);
    }

    if (Array.isArray(geojson)) {
        return {
            layers: geojson
                .filter((fc) => fc && fc.type === 'FeatureCollection' && fc.features?.length > 0)
                .map((fc) => ({
                    geojson: {
                        type: 'FeatureCollection',
                        features: fc.features.map((f) => ({
                            type: 'Feature',
                            geometry: f.geometry || null,
                            properties: f.properties || {}
                        }))
                    },
                    fileName: fc.fileName || null,
                    prjWkt
                }))
        };
    }

    if (!geojson || geojson.type !== 'FeatureCollection') {
        throw new Error('Shapefile produced invalid GeoJSON');
    }

    geojson.features = geojson.features.map((f) => ({
        type: 'Feature',
        geometry: f.geometry || null,
        properties: f.properties || {}
    }));

    return { geojson, prjWkt };
}

export default parseShapefileBuffer;

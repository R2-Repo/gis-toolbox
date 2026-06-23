/**
 * External library loader boundary.
 * Prefers globalThis (set by bootstrapGlobals); falls back to dynamic npm import.
 */

function createLoader(globalKey, importPath) {
    let cached = null;
    const loadLib = async function () {
        if (cached) return cached;

        const globalLib = globalThis[globalKey];
        if (globalLib) {
            cached = globalLib;
            return cached;
        }

        const mod = await import(importPath);
        cached = mod.default ?? mod;
        return cached;
    };

    loadLib.reset = () => {
        cached = null;
    };

    return loadLib;
}

export const loadPapaParse = createLoader('Papa', 'papaparse');
export const loadXLSX = createLoader('XLSX', 'xlsx');
export const loadJSZip = createLoader('JSZip', 'jszip');
export const loadToGeoJSON = createLoader('toGeoJSON', '@mapbox/togeojson');
export const loadShpjs = createLoader('shp', 'shpjs');
export const loadExifr = createLoader('exifr', 'exifr');
export const loadProj4 = createLoader('proj4', 'proj4');

export function resetLibLoadersForTests() {
    loadPapaParse.reset();
    loadXLSX.reset();
    loadJSZip.reset();
    loadToGeoJSON.reset();
    loadShpjs.reset();
    loadExifr.reset();
    loadProj4.reset();
}

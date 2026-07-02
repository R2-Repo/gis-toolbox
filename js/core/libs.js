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
export const loadToGpx = createLoader('togpx', 'togpx');
export const loadShpjs = createLoader('shp', 'shpjs');
export const loadExifr = createLoader('exifr', 'exifr');
export const loadProj4 = createLoader('proj4', 'proj4');

let _jsPDFConstructor = null;
export async function loadJsPDF() {
    if (_jsPDFConstructor) return _jsPDFConstructor;

    const globalLib = globalThis.jspdf;
    if (typeof globalLib === 'function') {
        _jsPDFConstructor = globalLib;
        return _jsPDFConstructor;
    }
    if (typeof globalLib?.jsPDF === 'function') {
        _jsPDFConstructor = globalLib.jsPDF;
        return _jsPDFConstructor;
    }

    const mod = await import('jspdf');
    const candidate = mod.jsPDF ?? mod.default;
    if (typeof candidate === 'function') {
        _jsPDFConstructor = candidate;
        return _jsPDFConstructor;
    }
    if (typeof candidate?.jsPDF === 'function') {
        _jsPDFConstructor = candidate.jsPDF;
        return _jsPDFConstructor;
    }

    throw new Error('jsPDF library failed to load');
}

export async function loadGifenc() {
    return import('gifenc');
}

export function resetLibLoadersForTests() {
    loadPapaParse.reset();
    loadXLSX.reset();
    loadJSZip.reset();
    loadToGeoJSON.reset();
    loadToGpx.reset();
    loadShpjs.reset();
    loadExifr.reset();
    loadProj4.reset();
    _jsPDFConstructor = null;
}

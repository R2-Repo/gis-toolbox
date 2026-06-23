/**
 * Unified import parse — worker when available, main-thread fallback.
 */
import { loadToGeoJSON, loadJSZip, loadShpjs } from '../core/libs.js';
import { parseGeoJSONText } from './parsers/parse-geojson.js';
import { parseKmlText } from './parsers/parse-kml.js';
import { extractKmlFromKmzBuffer } from './parsers/parse-kmz-buffer.js';
import { parseShapefileBuffer } from './parsers/parse-shapefile-buffer.js';
import { parseInWorker, cancelWorkerParse, supportsWorkers } from './import-worker-pool.js';

const WORKER_MIN_BYTES = 256 * 1024;

function shouldUseWorker(byteSize = 0) {
    return supportsWorkers() && byteSize >= WORKER_MIN_BYTES;
}

export async function parseGeoJSONForImport(text, byteSize = 0) {
    if (shouldUseWorker(byteSize)) {
        try {
            const result = await parseInWorker('geojson', text);
            if (result) return result;
        } catch (e) {
            if (e?.cancelled) throw e;
        }
    }
    return parseGeoJSONText(text);
}

export async function parseKmlForImport(text, byteSize = 0) {
    if (shouldUseWorker(byteSize)) {
        try {
            const result = await parseInWorker('kml', text);
            if (result) return result;
        } catch (e) {
            if (e?.cancelled) throw e;
        }
    }
    const toGeoJsonLib = await loadToGeoJSON();
    return parseKmlText(text, {
        DOMParserImpl: typeof DOMParser !== 'undefined' ? DOMParser : (await import('@xmldom/xmldom')).DOMParser,
        toGeoJsonLib
    });
}

export async function parseKmzForImport(buffer) {
    if (shouldUseWorker(buffer.byteLength)) {
        try {
            // Clone before transfer — transferring detaches the buffer; keep original for fallback.
            const workerBuffer = buffer.slice(0);
            const result = await parseInWorker('kmz', workerBuffer, { transfer: [workerBuffer] });
            if (result) return result;
        } catch (e) {
            if (e?.cancelled) throw e;
        }
    }
    const JSZipLib = await loadJSZip();
    const extracted = await extractKmlFromKmzBuffer(buffer, JSZipLib);
    const toGeoJsonLib = await loadToGeoJSON();
    const parsed = parseKmlText(extracted.kmlText, {
        DOMParserImpl: typeof DOMParser !== 'undefined' ? DOMParser : (await import('@xmldom/xmldom')).DOMParser,
        toGeoJsonLib
    });
    return {
        ...parsed,
        mainKmlPath: extracted.mainKmlPath,
        reason: extracted.reason,
        zip: extracted.zip
    };
}

export async function parseShapefileForImport(buffer) {
    if (shouldUseWorker(buffer.byteLength)) {
        try {
            const transfer = [buffer.slice(0)];
            const result = await parseInWorker('shapefile', transfer[0], { transfer });
            if (result) return result;
        } catch (e) {
            if (e?.cancelled) throw e;
        }
    }
    const shp = await loadShpjs();
    const JSZipLib = await loadJSZip();
    return parseShapefileBuffer(buffer, shp, { JSZipLib });
}

export { cancelWorkerParse, supportsWorkers };

export default {
    parseGeoJSONForImport,
    parseKmlForImport,
    parseKmzForImport,
    parseShapefileForImport,
    cancelWorkerParse,
    supportsWorkers
};

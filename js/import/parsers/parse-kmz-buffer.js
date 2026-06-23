import { normalizeZipPath } from '../zip-utils.js';

/**
 * Pick the primary KML entry inside a KMZ.
 * @param {import('jszip').JSZip.JSZipObject[]} kmlEntries
 */
export function chooseMainKmlEntry(kmlEntries) {
    if (kmlEntries.length === 1) {
        return { entry: kmlEntries[0], reason: 'only-kml' };
    }
    const norm = (e) => normalizeZipPath(e.name);
    const rootDoc = kmlEntries.find((e) => norm(e).toLowerCase() === 'doc.kml');
    if (rootDoc) return { entry: rootDoc, reason: 'root-doc.kml' };
    const nestedDoc = kmlEntries.find((e) => norm(e).toLowerCase().endsWith('/doc.kml'));
    if (nestedDoc) return { entry: nestedDoc, reason: 'nested-doc.kml' };
    const sorted = [...kmlEntries].sort((a, b) => {
        const da = norm(a).split('/').filter(Boolean).length;
        const db = norm(b).split('/').filter(Boolean).length;
        if (da !== db) return da - db;
        const sa = a._data?.uncompressedSize ?? 0;
        const sb = b._data?.uncompressedSize ?? 0;
        if (sb !== sa) return sb - sa;
        return norm(a).length - norm(b).length;
    });
    return { entry: sorted[0], reason: 'heuristic-shallow-largest' };
}

/**
 * Extract main KML text from a KMZ buffer.
 * @param {ArrayBuffer} buffer
 * @param {object} JSZipLib
 */
export async function extractKmlFromKmzBuffer(buffer, JSZipLib) {
    if (!JSZipLib?.loadAsync) {
        throw new Error('JSZip library not loaded');
    }

    let zip;
    try {
        zip = await JSZipLib.loadAsync(buffer);
    } catch (e) {
        throw new Error('Failed to unzip KMZ: ' + e.message);
    }

    const kmlFiles = [];
    zip.forEach((path, entry) => {
        if (path.toLowerCase().endsWith('.kml') && !entry.dir) {
            kmlFiles.push(entry);
        }
    });

    if (kmlFiles.length === 0) {
        throw new Error('KMZ contains no KML file');
    }

    const { entry: mainKml, reason } = chooseMainKmlEntry(kmlFiles);
    const kmlText = await mainKml.async('string');
    return { kmlText, mainKmlPath: mainKml.name, reason, zip };
}

export default extractKmlFromKmzBuffer;

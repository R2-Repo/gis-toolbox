/**
 * KMZ importer — worker parse path; preserve styling by default
 */
import { importKML } from './kml-importer.js';
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { loadJSZip } from '../core/libs.js';
import logger from '../core/logger.js';
import { parseKmzForImport } from './import-parse-service.js';
import {
    assertZipBufferWithinBudget,
    createKmzLinkResolver,
    normalizeZipPath,
    resolveZipInternalHref
} from './zip-utils.js';
import { extractKmlFromKmzBuffer } from './parsers/parse-kmz-buffer.js';

/** Max embedded asset size when rewriting KMZ hrefs (bytes). */
export const KMZ_EMBEDDED_ASSET_MAX_BYTES = 5 * 1024 * 1024;

export const DEFAULT_KMZ_IMPORT_MODE = 'preserve';

function _guessMimeFromPath(p) {
    const low = p.toLowerCase();
    if (low.endsWith('.png')) return 'image/png';
    if (low.endsWith('.jpg') || low.endsWith('.jpeg')) return 'image/jpeg';
    if (low.endsWith('.gif')) return 'image/gif';
    if (low.endsWith('.webp')) return 'image/webp';
    if (low.endsWith('.svg')) return 'image/svg+xml';
    if (low.endsWith('.kml')) return 'application/vnd.google-earth.kml+xml';
    return 'application/octet-stream';
}

async function _rewriteKmzEmbeddedHrefs(kmlText, zip, mainKmlPath, task, blobUrls = []) {
    const pathMap = new Map();
    zip.forEach((relPath, entry) => {
        if (entry.dir) return;
        pathMap.set(normalizeZipPath(relPath).toLowerCase(), entry);
    });

    const re = /<href>\s*([^<]+?)\s*<\/href>/gi;
    const targets = [];
    const seenRaw = new Set();
    let m;
    while ((m = re.exec(kmlText)) !== null) {
        const raw = m[1].trim();
        if (/^(https?:|data:|blob:)/i.test(raw) || raw.startsWith('#')) continue;
        if (seenRaw.has(raw)) continue;
        seenRaw.add(raw);
        const resolved = resolveZipInternalHref(mainKmlPath, raw);
        if (resolved) targets.push({ raw, resolved });
    }

    let out = kmlText;
    let n = 0;
    let skippedLarge = 0;
    for (const { raw, resolved } of targets) {
        const entry = pathMap.get(resolved.toLowerCase());
        if (!entry) continue;
        const uncompressed = entry._data?.uncompressedSize ?? 0;
        if (uncompressed > KMZ_EMBEDDED_ASSET_MAX_BYTES) {
            skippedLarge++;
            continue;
        }
        try {
            const buf = await entry.async('arraybuffer');
            const blob = new Blob([buf], { type: _guessMimeFromPath(resolved) });
            const url = URL.createObjectURL(blob);
            blobUrls.push(url);
            const escRaw = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            out = out.replace(new RegExp(`<href>\\s*${escRaw}\\s*</href>`, 'gi'), `<href>${url}</href>`);
            n++;
            if (n <= 5) {
                task?.updateProgress(52 + n, `Resolved in-archive asset (${n})…`);
            }
        } catch {
            /* skip unreadable entry */
        }
    }
    if (n > 0) {
        logger.info('Importer', 'KMZ embedded hrefs rewritten', { count: n, mainKmlPath });
    }
    return { kmlText: out, skippedLarge };
}

/**
 * @param {File} file
 * @param {import('../core/task-runner.js').TaskRunner} task
 * @param {{ buffer?: ArrayBuffer, importMode?: 'gis'|'preserve' }} [options]
 */
export async function importKMZ(file, task, options = {}) {
    const importMode = options.importMode ?? DEFAULT_KMZ_IMPORT_MODE;
    task.updateProgress(10, 'Reading KMZ...');

    const buffer = options.buffer ?? await file.arrayBuffer();
    const JSZipLib = await loadJSZip();
    if (!JSZipLib?.loadAsync) {
        throw new AppError('JSZip library not loaded', ErrorCategory.PARSE_FAILED);
    }

    await assertZipBufferWithinBudget(buffer, JSZipLib, file.name);

    if (importMode === 'preserve') {
        task.updateProgress(20, 'Extracting KMZ (preserve mode)...');
        let zip;
        try {
            zip = await JSZipLib.loadAsync(buffer);
        } catch (e) {
            throw new AppError('Failed to unzip KMZ: ' + e.message, ErrorCategory.PARSE_FAILED);
        }

        const extracted = await extractKmlFromKmzBuffer(buffer, JSZipLib);
        const blobUrls = [];
        const hrefResult = await _rewriteKmzEmbeddedHrefs(
            extracted.kmlText, zip, extracted.mainKmlPath, task, blobUrls
        );

        task.updateProgress(70, 'Parsing KML...');
        const dataset = await importKML(hrefResult.kmlText, task, {
            sourceFileName: file.name,
            importMode: 'preserve',
            text: hrefResult.kmlText
        });
        dataset.name = file.name.replace(/\.kmz$/i, '');
        dataset.source.file = file.name;
        dataset.source.format = 'kmz';

        if (hrefResult.skippedLarge > 0) {
            dataset._importWarning = `${hrefResult.skippedLarge} embedded asset(s) over ${Math.round(KMZ_EMBEDDED_ASSET_MAX_BYTES / (1024 * 1024))} MB were skipped to save memory.`;
        }
        if (blobUrls.length > 0) dataset._blobUrls = blobUrls;
        dataset._kmzLinkResolver = createKmzLinkResolver(zip, extracted.mainKmlPath);
        return dataset;
    }

    task.updateProgress(30, 'Parsing KMZ (GIS mode)...');
    const parsed = await parseKmzForImport(buffer);
    if (!parsed?.geojson) {
        throw new AppError('KMZ contains no parseable KML', ErrorCategory.PARSE_FAILED);
    }

    task.updateProgress(70, 'Building dataset...');
    const dataset = await importKML('kmz', task, {
        sourceFileName: file.name,
        importMode: 'gis',
        geojson: parsed.geojson,
        networkHrefs: parsed.networkHrefs || []
    });
    dataset.name = file.name.replace(/\.kmz$/i, '');
    dataset.source.file = file.name;
    dataset.source.format = 'kmz';
    dataset.source.importMode = 'gis';
    dataset._importWarning = dataset._importWarning
        ? `${dataset._importWarning} Imported as simplified GIS layer (styling/images stripped).`
        : 'Imported as simplified GIS layer (styling/images stripped).';
    return dataset;
}

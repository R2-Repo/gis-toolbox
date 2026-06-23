/**
 * Pre-import scan for optimizer UI.
 */
import { preflightFile, formatBytes } from '../import/import-preflight.js';
import {
    estimateImportPeakBytes,
    sniffFeatureCountEstimate,
    sniffCoordinateCountEstimate
} from '../import/import-memory-budget.js';
import { detectFormat } from '../import/importer.js';
import { sniffFieldsFromFile } from './import-field-sniff.js';
import { mergeScanFieldNames } from './import-field-filter.js';

/**
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function scanFileForImport(file) {
    const format = detectFormat(file);
    const preflight = preflightFile(file, { format });
    const peak = estimateImportPeakBytes(file);
    const featureEst = await sniffFeatureCountEstimate(file);
    const coordEst = await sniffCoordinateCountEstimate(file);

    const isKmlFamily = format === 'kml' || format === 'kmz' || format === 'xml';
    const recommendedMode = isKmlFamily ? 'gis' : 'direct';
    const fields = await sniffFieldsFromFile(file);

    return {
        fileName: file.name,
        sizeBytes: file.size,
        sizeLabel: formatBytes(file.size),
        format,
        preflight,
        estimatedPeakBytes: peak,
        estimatedPeakLabel: formatBytes(peak),
        featureEstimate: featureEst,
        coordinateEstimate: coordEst,
        recommendedMode,
        recommendedImportMode: isKmlFamily ? 'gis' : undefined,
        fields,
        warnings: preflight.message ? [preflight.message] : []
    };
}

/**
 * @param {File[]} files
 */
export async function scanFilesForImport(files) {
    const scans = await Promise.all(files.map((f) => scanFileForImport(f)));
    const allFields = mergeScanFieldNames(scans);
    return scans.map((scan) => ({ ...scan, allFields }));
}

export { mergeScanFieldNames };

export default { scanFileForImport, scanFilesForImport };

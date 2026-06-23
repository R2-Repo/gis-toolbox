/**
 * GeoJSON importer
 */
import { createSpatialDataset, explodeGeometryCollectionsInFeatureCollectionAsync } from '../core/data-model.js';
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { parseGeoJSONForImport } from './import-parse-service.js';

/**
 * @param {object} data parsed JSON root
 * @param {string} fileName
 * @param {import('../core/task-runner.js').TaskRunner} task
 */
export async function importGeoJSONFromParsed(data, fileName, task) {
    task.updateProgress(60, 'Normalizing...');

    let fc;
    if (data.type === 'FeatureCollection') {
        fc = data;
    } else if (data.type === 'Feature') {
        fc = { type: 'FeatureCollection', features: [data] };
    } else if (data.type && data.coordinates) {
        fc = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: data, properties: {} }] };
    } else {
        throw new AppError('Not a recognized GeoJSON structure', ErrorCategory.PARSE_FAILED, { file: fileName });
    }

    fc.features = fc.features.map((f) => ({
        type: 'Feature',
        geometry: f.geometry || null,
        properties: f.properties || {},
        ...((f.id != null) ? { id: f.id } : {})
    }));

    fc = await explodeGeometryCollectionsInFeatureCollectionAsync(fc, task);

    task.updateProgress(90, 'Building dataset...');
    return createSpatialDataset(
        fileName.replace(/\.(geo)?json$/i, ''),
        fc,
        { file: fileName, format: 'geojson' }
    );
}

/**
 * @param {File|string} source
 * @param {import('../core/task-runner.js').TaskRunner} task
 * @param {{ sourceFileName?: string, text?: string, parsed?: object, byteSize?: number }} [options]
 */
export async function importGeoJSON(source, task, options = {}) {
    const fileName = options.sourceFileName
        ?? (typeof source === 'string' ? 'data.geojson' : source.name);

    task.updateProgress(20, 'Parsing GeoJSON...');

    if (options.parsed) {
        return importGeoJSONFromParsed(options.parsed, fileName, task);
    }

    const text = options.text ?? (typeof source === 'string' ? source : await source.text());
    const byteSize = options.byteSize ?? text.length;

    let fc;
    try {
        ({ geojson: fc } = await parseGeoJSONForImport(text, byteSize));
    } catch (e) {
        throw new AppError(e.message?.includes('JSON') ? e.message : 'Invalid JSON in GeoJSON file', ErrorCategory.PARSE_FAILED, { file: fileName });
    }

    task.updateProgress(60, 'Normalizing...');
    fc = await explodeGeometryCollectionsInFeatureCollectionAsync(fc, task);

    task.updateProgress(90, 'Building dataset...');
    return createSpatialDataset(
        fileName.replace(/\.(geo)?json$/i, ''),
        fc,
        { file: fileName, format: 'geojson' }
    );
}

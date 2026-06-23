/**
 * KML importer using toGeoJSON library
 */
import { createSpatialDataset, explodeGeometryCollectionsInFeatureCollectionAsync } from '../core/data-model.js';
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { parseKmlForImport } from './import-parse-service.js';
import { extractKmlStyleFromFeatures } from './parsers/kml-style.js';
import { stripKmlPresentationFromGeoJSON } from './parsers/kml-strip.js';

/**
 * @param {File|string} file
 * @param {import('../core/task-runner.js').TaskRunner} task
 * @param {{ sourceFileName?: string, text?: string, byteSize?: number, importMode?: 'gis'|'preserve', geojson?: object, networkHrefs?: string[] }} [meta]
 */
export async function importKML(file, task, meta = {}) {
    const importMode = meta.importMode ?? 'preserve';

    let geojson;
    let networkHrefs = meta.networkHrefs || [];

    if (meta.geojson) {
        geojson = meta.geojson;
    } else {
        task.updateProgress(20, 'Reading KML...');

        let text;
        if (typeof file === 'string') {
            text = file;
        } else if (meta.text) {
            text = meta.text;
        } else {
            text = await file.text();
        }

        task.updateProgress(50, 'Parsing KML to GeoJSON...');

        const byteSize = meta.byteSize ?? text.length;
        try {
            const parsed = await parseKmlForImport(text, byteSize);
            geojson = parsed.geojson;
            networkHrefs = parsed.networkHrefs || [];
        } catch (e) {
            throw new AppError(e.message || 'Invalid KML/XML', ErrorCategory.PARSE_FAILED);
        }
    }

    if (importMode === 'gis') {
        geojson = stripKmlPresentationFromGeoJSON(geojson);
    }

    geojson = await explodeGeometryCollectionsInFeatureCollectionAsync(geojson, task);

    const featCount = geojson.features.length;
    let kmlStyle = null;
    if (importMode === 'preserve' && featCount > 0) {
        task.updateProgress(80, 'Extracting styles...');
        kmlStyle = extractKmlStyleFromFeatures(geojson.features);
    }

    task.updateProgress(90, 'Building dataset...');
    const defaultName = typeof file === 'string'
        ? (meta.sourceFileName || 'KML_Layer').replace(/\.(kml|xml|kmz)$/i, '')
        : file.name.replace(/\.(kml|xml)$/i, '');
    const sourceFile = typeof file === 'string'
        ? (meta.sourceFileName || 'extracted.kml')
        : file.name;

    const dataset = createSpatialDataset(defaultName, geojson, {
        file: sourceFile,
        format: 'kml',
        importMode
    });

    if (kmlStyle) dataset._kmlStyle = kmlStyle;

    if (featCount === 0 && networkHrefs.length > 0) {
        dataset._networkLinkHrefs = networkHrefs;
        dataset._importWarning =
            'KML has no direct features but contains network links. You can try resolving them (CORS may block some URLs).';
    } else if (featCount === 0) {
        dataset._importWarning = 'KML contains no placemarks or geometries. An empty layer was created.';
    }

    return dataset;
}

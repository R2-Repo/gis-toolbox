/**
 * Generic JSON importer — detects GeoJSON vs plain table
 */
import { createSpatialDataset, createTableDataset, explodeGeometryCollectionsInFeatureCollectionAsync } from '../core/data-model.js';
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { importGeoJSONFromParsed } from './geojson-importer.js';
import { parseCoordValue, detectAnyCoordinateColumns } from './coord-detect.js';
import { projectedTableCrsMetadata } from './import-crs.js';

/**
 * @param {File} file
 * @param {import('../core/task-runner.js').TaskRunner} task
 * @param {{ text?: string, parsed?: object }} [options]
 */
export async function importJSON(file, task, options = {}) {
    task.updateProgress(20, 'Parsing JSON...');

    let data = options.parsed;
    if (!data) {
        const text = options.text ?? await file.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new AppError('Invalid JSON', ErrorCategory.PARSE_FAILED, { file: file.name });
        }
    }

    task.updateProgress(50, 'Detecting format...');

    if (data.type === 'FeatureCollection' || data.type === 'Feature' ||
        (data.type && data.coordinates)) {
        return importGeoJSONFromParsed(data, file.name, task);
    }

    if (data.features && Array.isArray(data.features) && data.features[0]?.attributes) {
        const features = data.features.map(f => ({
            type: 'Feature',
            geometry: convertEsriGeometry(f.geometry),
            properties: f.attributes || {}
        }));
        const fc = await explodeGeometryCollectionsInFeatureCollectionAsync({
            type: 'FeatureCollection',
            features
        }, task);
        return createSpatialDataset(
            file.name.replace(/\.json$/i, ''),
            fc,
            { file: file.name, format: 'json-esri' }
        );
    }

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        task.updateProgress(70, 'Detecting coordinates...');
        const fields = Object.keys(data[0]);
        const coordInfo = detectAnyCoordinateColumns(fields, data);
        if (coordInfo) {
            task.updateProgress(80, 'Creating spatial dataset...');
            return rowsToSpatial(data, coordInfo, file, options);
        }
        task.updateProgress(80, 'Creating table dataset...');
        return createTableDataset(
            file.name.replace(/\.json$/i, ''),
            data,
            null,
            { file: file.name, format: 'json-table' }
        );
    }

    for (const key of ['data', 'records', 'results', 'rows', 'items']) {
        if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
            const rows = data[key];
            const fields = Object.keys(rows[0]);
            const coordInfo = detectAnyCoordinateColumns(fields, rows);
            if (coordInfo) {
                return rowsToSpatial(rows, coordInfo, file, options);
            }
            return createTableDataset(
                file.name.replace(/\.json$/i, ''),
                rows,
                null,
                { file: file.name, format: 'json-table' }
            );
        }
    }

    throw new AppError(
        'Could not detect a table or GeoJSON structure in this JSON file',
        ErrorCategory.PARSE_FAILED,
        { file: file.name }
    );
}

function rowsToSpatial(rows, coordInfo, file, options = {}) {
    const features = rows.map(row => {
        const lat = parseCoordValue(row[coordInfo.latField]);
        const lon = parseCoordValue(row[coordInfo.lonField]);
        const geom = (!isNaN(lat) && !isNaN(lon))
            ? { type: 'Point', coordinates: [lon, lat] }
            : null;
        return { type: 'Feature', geometry: geom, properties: { ...row } };
    });
    const fc = { type: 'FeatureCollection', features };
    const crsMeta = coordInfo.projected
        ? projectedTableCrsMetadata(options.sourceCrs)
        : { crs: 'EPSG:4326', crsDetected: 'default' };
    const ds = createSpatialDataset(
        file.name.replace(/\.json$/i, ''),
        fc,
        {
            file: file.name,
            format: 'json-spatial',
            coordDetected: coordInfo,
            crsDetected: crsMeta.crsDetected,
            crsWarning: crsMeta.crsWarning
        },
        { crs: crsMeta.crs }
    );
    ds._coordInfo = coordInfo;
    return ds;
}

function convertEsriGeometry(geom) {
    if (!geom) return null;
    if (geom.x != null && geom.y != null) {
        return { type: 'Point', coordinates: [geom.x, geom.y] };
    }
    if (geom.rings) {
        return {
            type: geom.rings.length === 1 ? 'Polygon' : 'MultiPolygon',
            coordinates: geom.rings.length === 1 ? geom.rings : geom.rings.map(r => [r])
        };
    }
    if (geom.paths) {
        return {
            type: geom.paths.length === 1 ? 'LineString' : 'MultiLineString',
            coordinates: geom.paths.length === 1 ? geom.paths[0] : geom.paths
        };
    }
    if (geom.points) {
        return { type: 'MultiPoint', coordinates: geom.points };
    }
    return null;
}

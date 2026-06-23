/**
 * Excel (.xlsx) importer using SheetJS
 */
import { createTableDataset, createSpatialDataset } from '../core/data-model.js';
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { loadXLSX } from '../core/libs.js';
import {
    parseCoordValue,
    detectCoordinateColumns,
    detectProjectedColumns
} from './coord-detect.js';
import { projectedTableCrsMetadata } from './import-crs.js';

function _detectCoordInfo(fields, rows) {
    return detectCoordinateColumns(fields, rows) || detectProjectedColumns(fields, rows);
}

export async function importExcel(file, task, options = {}) {
    task.updateProgress(20, 'Loading SheetJS...');

    const xlsx = await loadXLSX();
    if (!xlsx?.read || !xlsx?.utils) {
        throw new AppError('SheetJS library not loaded', ErrorCategory.PARSE_FAILED);
    }

    task.updateProgress(30, 'Reading Excel file...');
    const buffer = options.buffer ?? await file.arrayBuffer();

    task.updateProgress(50, 'Parsing workbook...');
    let workbook;
    try {
        workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
    } catch (e) {
        throw new AppError('Failed to parse Excel file: ' + e.message, ErrorCategory.PARSE_FAILED);
    }

    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
        throw new AppError('Excel file contains no sheets', ErrorCategory.PARSE_FAILED);
    }

    const sheetName = sheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    task.updateProgress(70, `Parsing sheet: ${sheetName}...`);
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
        throw new AppError('Excel sheet is empty', ErrorCategory.PARSE_FAILED);
    }

    const fields = Object.keys(rows[0]);
    const name = file.name.replace(/\.(xlsx|xls)$/i, '') + (sheetNames.length > 1 ? `_${sheetName}` : '');

    const coordInfo = _detectCoordInfo(fields, rows);

    if (coordInfo) {
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
        const ds = createSpatialDataset(name, fc, {
            file: file.name, format: 'xlsx', sheet: sheetName,
            sheets: sheetNames, coordDetected: coordInfo,
            crsDetected: crsMeta.crsDetected,
            crsWarning: crsMeta.crsWarning
        }, { crs: crsMeta.crs });
        ds._coordInfo = coordInfo;
        ds._sheets = sheetNames;
        ds._workbook = workbook;
        return ds;
    }

    const ds = createTableDataset(name, rows, fields, {
        file: file.name, format: 'xlsx', sheet: sheetName, sheets: sheetNames
    });
    ds._sheets = sheetNames;
    ds._workbook = workbook;
    return ds;
}

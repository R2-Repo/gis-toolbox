/**
 * Excel exporter using SheetJS
 */
import { loadXLSX } from '../core/libs.js';

export async function exportExcel(dataset, options = {}, task) {
    const xlsx = await loadXLSX();
    if (!xlsx?.utils || !xlsx?.write) {
        throw new Error('SheetJS library not loaded');
    }

    task?.updateProgress(30, 'Building spreadsheet...');
    const rows = getRows(dataset);
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, options.sheetName || 'Data');

    task?.updateProgress(70, 'Generating file...');
    const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    task?.updateProgress(90, 'Done');
    return { blob };
}

function getRows(dataset) {
    if (dataset.rows) return dataset.rows;
    if (dataset.geojson?.features) {
        return dataset.geojson.features.map(f => {
            const row = { ...f.properties };
            if (f.geometry?.type === 'Point') {
                row.longitude = f.geometry.coordinates[0];
                row.latitude = f.geometry.coordinates[1];
            }
            return row;
        });
    }
    return [];
}

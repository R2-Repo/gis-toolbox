import { generateStationEventOutput, summarizeStationEventRows } from './station-event-plot.js';

export async function validateStationTableRows(rows, routeLine, routeProfile, mapping, options = {}) {
    return generateStationEventOutput(rows, routeLine, routeProfile, mapping, {
        ...options,
        includeQaLines: true
    });
}

export function buildUnplottedRowsReport(unplottedRows = []) {
    return unplottedRows.map((row, index) => ({
        source_row_number: row.source_row_number ?? index + 1,
        plot_status: row.plot_status || 'Unplotted',
        plot_error: row.plot_error || '',
        station_raw: row.station_raw || '',
        offset_raw: row.offset_raw || '',
        side_raw: row.side_raw || '',
        lat_raw: row.lat_raw || '',
        lon_raw: row.lon_raw || '',
        suggested_fix: row.suggested_fix || '',
        ...row
    }));
}

export function buildQaSummary(reviewedRows = [], detection = {}, routeProfile = {}) {
    const summary = summarizeStationEventRows(reviewedRows);
    return {
        ...summary,
        detectedStationColumn: detection.station?.field || '',
        detectedOffsetColumn: detection.offset?.field || '',
        detectedSideColumn: detection.side?.field || '',
        detectedLatitudeColumn: detection.latitude?.field || '',
        detectedLongitudeColumn: detection.longitude?.field || '',
        routeName: routeProfile.route_name || '',
        stationRange: `${routeProfile.start_station_label || ''} to ${routeProfile.end_station_label || ''}`.trim()
    };
}

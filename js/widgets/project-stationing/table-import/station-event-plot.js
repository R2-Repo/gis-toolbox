import {
    buildStationLabelPoint,
    formatStation,
    getLocalTangentBearing
} from '../engine.js';
import { reprojectCoordinate } from '../../../crs/reproject.js';
import { looksProjected } from '../../../crs/detect.js';
import {
    ERROR_CODES,
    STATIONING_STATUS,
    distanceAlongRouteToStation,
    parseCombinedCoordinate,
    parseCombinedStationOffset,
    parseCoordinateValue,
    parseOffsetValue,
    parseStationValue,
    stationToDistanceAlongRoute
} from './station-table-parse.js';
import {
    applyLocatorNamingOptions,
    computeStationLocatorFields,
    resolveSideDirectionMapping,
    suggestSideDirectionMapping
} from './station-locator-name.js';

const DEFAULT_OPTIONS = {
    coordinateFarThresholdFt: 250,
    coordinateWarningThresholdFt: 10,
    coordinateConflictThresholdFt: 50,
    positiveOffsetMeans: 'right',
    includeQaLines: false
};

function getValue(row, field) {
    if (!field) return '';
    return row?.[field] ?? '';
}

function uniqueSystemFields(original = {}, additions = {}) {
    const out = { ...original };
    for (const [key, value] of Object.entries(additions)) {
        let safe = key;
        let i = 2;
        while (Object.prototype.hasOwnProperty.call(out, safe)) {
            safe = `${key}_${i}`;
            i++;
        }
        out[safe] = value;
    }
    return out;
}

function pointFeature(coordinates, properties) {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates },
        properties
    };
}

function lineFeature(coords, properties) {
    return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties
    };
}

function classifyByWarnings(warnings = []) {
    if (warnings.includes(ERROR_CODES.STATION_COORDINATE_CONFLICT)) return STATIONING_STATUS.COORDINATE_CONFLICT;
    if (warnings.length > 0) return STATIONING_STATUS.WARNING;
    return STATIONING_STATUS.READY;
}

function tableLabel(row, mapping) {
    return String(getValue(row, mapping.label) || '').trim();
}

function nearestStationForCoordinate(coordPoint, routeLine, routeProfile) {
    const snapped = turf.nearestPointOnLine(routeLine, coordPoint, { units: 'feet' });
    const routeDistanceFt = Number(snapped.properties?.location ?? 0);
    const nearestStationFeet = distanceAlongRouteToStation(routeDistanceFt, routeProfile.start_station_feet);
    const offsetFt = Number(snapped.properties?.dist ?? 0);
    return {
        routeDistanceFt,
        nearestStationFeet,
        nearestStationLabel: formatStation(nearestStationFeet),
        offsetFt,
        snapped
    };
}

export function normalizeStationEventRow(row, mapping = {}, routeProfile = {}, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const rowNumber = options.rowNumber ?? 0;
    const combined = parseCombinedStationOffset(getValue(row, mapping.station), opts);
    const station = combined.station.valid
        ? combined.station
        : parseStationValue(getValue(row, mapping.station), opts);
    const offset = parseOffsetValue(
        getValue(row, mapping.offset) || combined.offset.raw,
        getValue(row, mapping.side),
        opts
    );

    let coordinates = { valid: false };
    if (options.reprojectedCoordinates) {
        coordinates = {
            valid: true,
            latitude: options.reprojectedCoordinates[1],
            longitude: options.reprojectedCoordinates[0]
        };
    } else if (mapping.latitude && mapping.longitude) {
        coordinates = parseCoordinateValue(getValue(row, mapping.latitude), getValue(row, mapping.longitude));
    } else if (mapping.combinedCoordinate) {
        coordinates = parseCombinedCoordinate(getValue(row, mapping.combinedCoordinate));
    }

    const distanceAlongRouteFt = station.valid
        ? stationToDistanceAlongRoute(station.stationFeet, routeProfile.start_station_feet)
        : null;

    return {
        row,
        rowNumber,
        station,
        offset,
        coordinates,
        distanceAlongRouteFt,
        stationLabel: station.valid ? station.stationLabel : '',
        warnings: [
            ...(station.warnings || []),
            ...(offset.warnings || []),
            ...(coordinates.projectedLike && !options.reprojectedCoordinates
                ? [ERROR_CODES.PROJECTED_COORDINATES_NEED_CRS]
                : [])
        ].filter(Boolean)
    };
}

export function classifyLocationMethod(normalized) {
    if (normalized.station.valid && normalized.offset.valid && normalized.offset.offsetFeet > 0) return 'station_offset';
    if (normalized.station.valid) return 'station';
    if (normalized.coordinates.valid) return 'coordinates';
    return 'cannot_locate';
}

export function plotStationEvent(row, routeLine, routeProfile, mapping = {}, options = {}) {
    if (typeof turf === 'undefined') throw new Error('Turf.js not loaded');
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const normalized = normalizeStationEventRow(row, mapping, routeProfile, opts);
    const warnings = [...normalized.warnings];
    const errors = [];
    const method = classifyLocationMethod(normalized);
    const totalLengthFt = Number(routeProfile.total_length_ft ?? 0);
    let stationPoint = null;
    let eventPoint = null;
    let coordinatePoint = null;
    let connector = null;
    let qaLine = null;
    let routeDistanceFt = normalized.distanceAlongRouteFt;

    if (normalized.coordinates.valid) {
        coordinatePoint = turf.point([normalized.coordinates.longitude, normalized.coordinates.latitude]);
    }

    if (normalized.station.valid) {
        if (routeDistanceFt < -0.001 || routeDistanceFt > totalLengthFt + 0.001) {
            errors.push(ERROR_CODES.STATION_OUTSIDE_ROUTE);
        } else {
            routeDistanceFt = Math.max(0, Math.min(routeDistanceFt, totalLengthFt));
            stationPoint = turf.along(routeLine, routeDistanceFt, { units: 'feet' });
            const bearing = getLocalTangentBearing(routeLine, routeDistanceFt, opts.tangentSampleFt || 10);
            const side = normalized.offset.offsetSide === 'LT' ? 'left' : 'right';
            eventPoint = normalized.offset.offsetFeet > 0
                ? buildStationLabelPoint(stationPoint, bearing, normalized.offset.offsetFeet, side)
                : stationPoint;
            if (normalized.offset.offsetFeet > 0) {
                connector = lineFeature(
                    [stationPoint.geometry.coordinates, eventPoint.geometry.coordinates],
                    {
                        station_label: normalized.stationLabel,
                        offset_feet: normalized.offset.offsetFeet,
                        offset_side: normalized.offset.offsetSide,
                        source_row_number: normalized.rowNumber
                    }
                );
            }
        }
    } else if (coordinatePoint) {
        eventPoint = coordinatePoint;
        const nearest = nearestStationForCoordinate(coordinatePoint, routeLine, routeProfile);
        routeDistanceFt = nearest.routeDistanceFt;
        if (nearest.offsetFt > opts.coordinateFarThresholdFt) {
            warnings.push(ERROR_CODES.COORDINATE_FAR_FROM_ROUTE);
        }
        normalized.stationLabel = nearest.nearestStationLabel;
    } else {
        errors.push(ERROR_CODES.MISSING_LOCATION);
    }

    if (eventPoint && coordinatePoint && normalized.station.valid) {
        const deltaFt = turf.distance(eventPoint, coordinatePoint, { units: 'feet' });
        if (deltaFt > opts.coordinateConflictThresholdFt) warnings.push(ERROR_CODES.STATION_COORDINATE_CONFLICT);
        else if (deltaFt > opts.coordinateWarningThresholdFt) warnings.push(ERROR_CODES.STATION_COORDINATE_WARNING);
        qaLine = lineFeature(
            [eventPoint.geometry.coordinates, coordinatePoint.geometry.coordinates],
            {
                source_row_number: normalized.rowNumber,
                station_label: normalized.stationLabel,
                delta_ft: Math.round(deltaFt * 100) / 100,
                validation_status: deltaFt > opts.coordinateConflictThresholdFt ? 'Conflict' : deltaFt > opts.coordinateWarningThresholdFt ? 'Warning' : 'Match'
            }
        );
    }

    const status = errors.includes(ERROR_CODES.STATION_OUTSIDE_ROUTE)
        ? STATIONING_STATUS.OUTSIDE_ROUTE
        : errors.length > 0
            ? STATIONING_STATUS.UNPLOTTED
            : classifyByWarnings(warnings);
    const locationMethod = method === 'station' && coordinatePoint
        ? 'station_validated_by_coordinates'
        : method === 'station_offset' && coordinatePoint
            ? 'station_offset_validated_by_coordinates'
            : method;
    const plottable = Boolean(eventPoint && !errors.length && status !== STATIONING_STATUS.COORDINATE_CONFLICT);

    let locatorFields = {
        locator_name: routeProfile.route_name || `Row ${normalized.rowNumber}`,
        locator_milepost: null,
        locator_milepost_label: '',
        travel_direction: ''
    };
    if (routeDistanceFt != null && Number.isFinite(routeDistanceFt) && !errors.includes(ERROR_CODES.STATION_OUTSIDE_ROUTE)) {
        locatorFields = computeStationLocatorFields({
            routeProfile,
            routeDistanceFt,
            stationLabel: normalized.stationLabel,
            offsetSide: normalized.offset.offsetSide,
            sideDirectionMapping: opts.sideDirectionMapping || {}
        });
    }

    const systemProps = {
        stationing_station_raw: normalized.station.raw || '',
        stationing_station_label: normalized.stationLabel || '',
        stationing_station_feet: normalized.station.stationFeet ?? null,
        stationing_route_distance_ft: routeDistanceFt != null ? Math.round(routeDistanceFt * 100) / 100 : null,
        stationing_offset_raw: normalized.offset.raw || '',
        stationing_offset_feet: normalized.offset.offsetFeet ?? 0,
        stationing_offset_side: normalized.offset.offsetSide || 'CL',
        stationing_location_method: locationMethod,
        stationing_plot_status: status,
        stationing_plot_warning: [...warnings, ...errors].join('; '),
        stationing_source_row_number: normalized.rowNumber,
        stationing_route_id: routeProfile.route_id || '',
        route_direction: routeProfile.route_direction || '',
        locator_name: locatorFields.locator_name,
        locator_milepost: locatorFields.locator_milepost,
        locator_milepost_label: locatorFields.locator_milepost_label,
        travel_direction: locatorFields.travel_direction,
        table_label: tableLabel(row, mapping),
        name: locatorFields.locator_name
    };

    return {
        normalized,
        status,
        errors,
        warnings,
        plottable,
        eventFeature: eventPoint ? pointFeature(eventPoint.geometry.coordinates, uniqueSystemFields(row, systemProps)) : null,
        connector,
        qaLine,
        unplottedRow: plottable ? null : {
            source_row_number: normalized.rowNumber,
            plot_status: status,
            plot_error: [...errors, ...warnings].join('; ') || 'Row was not plotted.',
            station_raw: normalized.station.raw || '',
            offset_raw: normalized.offset.raw || '',
            lat_raw: getValue(row, mapping.latitude),
            lon_raw: getValue(row, mapping.longitude),
            suggested_fix: errors.includes(ERROR_CODES.STATION_OUTSIDE_ROUTE) ? 'Check route or station value.' : 'Review row location fields.',
            ...row
        }
    };
}

export async function resolveRowCoordinateReprojection(row, mapping, coordinateCrs) {
    if (!coordinateCrs) return null;
    let x;
    let y;
    if (mapping.latitude && mapping.longitude) {
        x = Number(getValue(row, mapping.longitude));
        y = Number(getValue(row, mapping.latitude));
    } else if (mapping.combinedCoordinate) {
        const parsed = parseCombinedCoordinate(getValue(row, mapping.combinedCoordinate));
        if (!parsed.valid) return null;
        x = parsed.longitude;
        y = parsed.latitude;
    } else {
        return null;
    }
    if (!looksProjected(x, y)) return null;
    return reprojectCoordinate([x, y], coordinateCrs, 'EPSG:4326');
}

export async function generateStationEventOutput(rows = [], routeLine, routeProfile, mapping = {}, options = {}) {
    const suggestion = options.sideDirectionSuggestion
        || suggestSideDirectionMapping(routeLine, routeProfile);
    const sideDirectionMapping = resolveSideDirectionMapping(options.locatorNaming || {}, suggestion);
    const resolvedProfile = applyLocatorNamingOptions(routeProfile, options.locatorNaming || {});
    const eventPoints = [];
    const connectorLines = [];
    const qaLines = [];
    const unplottedRows = [];
    const reviewedRows = [];

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowOptions = { ...options, rowNumber: index + 1, sideDirectionMapping };
        if (options.coordinateCrs) {
            const reprojected = await resolveRowCoordinateReprojection(row, mapping, options.coordinateCrs);
            if (reprojected) rowOptions.reprojectedCoordinates = reprojected;
        }
        const result = plotStationEvent(row, routeLine, resolvedProfile, mapping, rowOptions);
        reviewedRows.push({
            rowNumber: index + 1,
            status: result.status,
            method: result.eventFeature?.properties?.stationing_location_method || 'cannot_locate',
            station: result.eventFeature?.properties?.stationing_station_label || result.normalized.stationLabel || '',
            issue: [...result.errors, ...result.warnings].join('; ')
        });
        if (result.plottable && result.eventFeature) eventPoints.push(result.eventFeature);
        if (result.plottable && result.connector) connectorLines.push(result.connector);
        if (result.qaLine) qaLines.push(result.qaLine);
        if (result.unplottedRow) unplottedRows.push(result.unplottedRow);
    }

    let sampleLocatorNameRt = '';
    let sampleLocatorNameLt = '';
    for (const feature of eventPoints) {
        const side = feature.properties?.stationing_offset_side;
        if (side === 'RT' && !sampleLocatorNameRt) {
            sampleLocatorNameRt = feature.properties?.locator_name || '';
        }
        if (side === 'LT' && !sampleLocatorNameLt) {
            sampleLocatorNameLt = feature.properties?.locator_name || '';
        }
    }

    return {
        eventPoints,
        connectorLines,
        qaLines,
        unplottedRows,
        reviewedRows,
        summary: summarizeStationEventRows(reviewedRows),
        sampleLocatorName: sampleLocatorNameRt || sampleLocatorNameLt || eventPoints[0]?.properties?.locator_name || '',
        sampleLocatorNameRt,
        sampleLocatorNameLt,
        milepostMetadataAvailable: resolvedProfile.begin_milepost != null && resolvedProfile.end_milepost != null,
        sideDirectionMapping,
        travelDirection: sideDirectionMapping.rtDirection || ''
    };
}

export function summarizeStationEventRows(reviewedRows = []) {
    const summary = {
        importedRows: reviewedRows.length,
        ready: 0,
        warnings: 0,
        needsReview: 0,
        outsideRoute: 0,
        coordinateConflicts: 0,
        unplotted: 0
    };
    reviewedRows.forEach((row) => {
        if (row.status === STATIONING_STATUS.READY) summary.ready++;
        else if (row.status === STATIONING_STATUS.WARNING) summary.warnings++;
        else if (row.status === STATIONING_STATUS.NEEDS_REVIEW) summary.needsReview++;
        else if (row.status === STATIONING_STATUS.OUTSIDE_ROUTE) summary.outsideRoute++;
        else if (row.status === STATIONING_STATUS.COORDINATE_CONFLICT) summary.coordinateConflicts++;
        else summary.unplotted++;
    });
    return summary;
}

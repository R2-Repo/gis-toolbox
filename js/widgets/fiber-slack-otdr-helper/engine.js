import { lineLengthAny, lineSliceAlongRoute } from '../../tools/line-geojson.js';

export const FEET_PER_METER = 3.280839895;
export const FEET_PER_MILE = 5280;
export const FEET_PER_KILOMETER = FEET_PER_METER * 1000;
export const NEAR_LINE_FT = 50;
export const MERGE_TOLERANCE_FT = 3;

export const WORKFLOWS = {
    PLOT_OTDR: 'plot_otdr',
    GET_OTDR: 'get_otdr',
    CALCULATOR: 'calculator'
};

export const DIRECTIONS = {
    FROM_START: 'from_start',
    FROM_END: 'from_end',
    REVERSE: 'reverse'
};

export const SCENARIOS = {
    LAUNCH_ONLY: 'launch_only',
    PANEL_TO_PANEL: 'panel_to_panel',
    PANEL_TO_CABINET: 'panel_to_cabinet',
    CABINET_TO_PANEL: 'cabinet_to_panel',
    PANEL_THROUGH_JUMPER: 'panel_through_jumper',
    CUSTOM: 'custom'
};

export const DEFAULT_SLACK_SETTINGS = {
    slackPerLocationFt: 50,
    spacingFt: 500,
    fixedAddedSlackFt: 0,
    manualSlackLocations: null,
    launchCableFt: 0,
    receiveCableFt: 0,
    panelJumperFt: 0,
    cabinetJumperFt: 0,
    buildingPassThroughJumperFt: 0,
    rounding: 'none'
};

export const UNIT_LABELS = [
    { value: 'feet', label: 'Feet', abbr: 'ft' },
    { value: 'meters', label: 'Meters', abbr: 'm' },
    { value: 'miles', label: 'Miles', abbr: 'mi' },
    { value: 'kilometers', label: 'Kilometers', abbr: 'km' }
];

export const WORKFLOW_OPTIONS = [
    {
        value: WORKFLOWS.PLOT_OTDR,
        label: 'Plot OTDR distance on map',
        tip: 'Enter a known OTDR distance and place a point on the route after subtracting estimated slack.'
    },
    {
        value: WORKFLOWS.GET_OTDR,
        label: 'Get OTDR distance from map',
        tip: 'Click a point on the route and estimate the OTDR distance after adding slack.'
    },
    {
        value: WORKFLOWS.CALCULATOR,
        label: 'Calculator only',
        tip: 'Convert between map distance and OTDR distance without using the map.'
    }
];

export const DIRECTION_OPTIONS = [
    { value: DIRECTIONS.FROM_START, label: 'From start of selected line/route' },
    { value: DIRECTIONS.FROM_END, label: 'From end of selected line/route' },
    { value: DIRECTIONS.REVERSE, label: 'Reverse direction' }
];

export const SCENARIO_OPTIONS = [
    { value: SCENARIOS.LAUNCH_ONLY, label: 'Launch cable only' },
    { value: SCENARIOS.PANEL_TO_PANEL, label: 'Building panel to building panel' },
    { value: SCENARIOS.PANEL_TO_CABINET, label: 'Building panel to field cabinet' },
    { value: SCENARIOS.CABINET_TO_PANEL, label: 'Field cabinet to building panel' },
    { value: SCENARIOS.PANEL_THROUGH_JUMPER, label: 'Building panel through building jumper' },
    { value: SCENARIOS.CUSTOM, label: 'Custom' }
];

/** @type {Record<string, string[]>} */
export const SCENARIO_OFFSET_MAP = {
    [SCENARIOS.LAUNCH_ONLY]: ['launchCableFt', 'receiveCableFt'],
    [SCENARIOS.PANEL_TO_PANEL]: ['launchCableFt', 'receiveCableFt', 'panelJumperFt'],
    [SCENARIOS.PANEL_TO_CABINET]: ['launchCableFt', 'receiveCableFt', 'panelJumperFt', 'cabinetJumperFt'],
    [SCENARIOS.CABINET_TO_PANEL]: ['launchCableFt', 'receiveCableFt', 'cabinetJumperFt', 'panelJumperFt'],
    [SCENARIOS.PANEL_THROUGH_JUMPER]: ['launchCableFt', 'receiveCableFt', 'panelJumperFt', 'buildingPassThroughJumperFt'],
    [SCENARIOS.CUSTOM]: []
};

export const IDEAL_DATA_HELP_TEXT =
    'Best results happen when your fiber route is drawn as one continuous line in the same order the OTDR shot travels. '
    + 'If your route is split into multiple cable segments, select the segments in order or use the route ordering tools before running the calculation. '
    + 'The widget can still work with generic line layers, but clean continuous route lines will produce the most predictable results.';

export function unitAbbr(unit) {
    return UNIT_LABELS.find((entry) => entry.value === unit)?.abbr ?? unit;
}

/**
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} [toUnit='feet']
 * @returns {number}
 */
export function convertDistance(value, fromUnit, toUnit = 'feet') {
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    const feet = distanceToFeet(n, fromUnit);
    return feetToUnit(feet, toUnit);
}

/**
 * @param {number} value
 * @param {string} unit
 * @returns {number}
 */
export function distanceToFeet(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    switch (unit) {
        case 'meters':
            return n * FEET_PER_METER;
        case 'miles':
            return n * FEET_PER_MILE;
        case 'kilometers':
            return n * FEET_PER_KILOMETER;
        default:
            return n;
    }
}

/**
 * @param {number} feet
 * @param {string} unit
 * @returns {number}
 */
export function feetToUnit(feet, unit) {
    const n = Number(feet);
    if (!Number.isFinite(n)) return NaN;
    switch (unit) {
        case 'meters':
            return n / FEET_PER_METER;
        case 'miles':
            return n / FEET_PER_MILE;
        case 'kilometers':
            return n / FEET_PER_KILOMETER;
        default:
            return n;
    }
}

/**
 * @param {number} feetValue
 * @returns {{ feet: number, meters: number, miles: number, kilometers: number }}
 */
export function convertToAllUnits(feetValue) {
    return {
        feet: feetValue,
        meters: feetToUnit(feetValue, 'meters'),
        miles: feetToUnit(feetValue, 'miles'),
        kilometers: feetToUnit(feetValue, 'kilometers')
    };
}

/**
 * @param {object} settings
 * @returns {object}
 */
export function normalizeSlackSettings(settings = {}) {
    return {
        ...DEFAULT_SLACK_SETTINGS,
        ...settings,
        manualSlackLocations: settings.manualSlackLocations === '' || settings.manualSlackLocations == null
            ? null
            : Number(settings.manualSlackLocations)
    };
}

/**
 * @param {number} mapDistanceFt
 * @param {object} settings
 * @returns {{ locationCount: number, estimatedSlackFt: number }}
 */
export function computeEstimatedSlack(mapDistanceFt, settings = {}) {
    const s = normalizeSlackSettings(settings);
    const slackPerLocation = Number(s.slackPerLocationFt) || 0;
    let locationCount;

    if (s.manualSlackLocations != null && Number.isFinite(s.manualSlackLocations)) {
        locationCount = Math.max(0, s.manualSlackLocations);
    } else {
        const spacing = Number(s.spacingFt);
        if (!Number.isFinite(spacing) || spacing <= 0) {
            locationCount = 0;
        } else {
            locationCount = Math.floor(Math.max(0, mapDistanceFt) / spacing);
        }
    }

    return {
        locationCount,
        estimatedSlackFt: locationCount * slackPerLocation
    };
}

/**
 * @param {string} scenario
 * @param {object} settings
 * @returns {number}
 */
export function computeScenarioOffsets(scenario, settings = {}) {
    const s = normalizeSlackSettings(settings);
    const fields = SCENARIO_OFFSET_MAP[scenario] || [];
    return fields.reduce((sum, field) => sum + (Number(s[field]) || 0), 0);
}

/**
 * @param {number} mapDistanceFt
 * @param {object} settings
 * @param {string} scenario
 * @returns {{ estimatedSlackFt: number, scenarioOffsetsFt: number, fixedAddedSlackFt: number, totalAdjustmentFt: number, locationCount: number }}
 */
export function computeTotalSlackAdjustment(mapDistanceFt, settings = {}, scenario = SCENARIOS.CUSTOM) {
    const s = normalizeSlackSettings(settings);
    const { locationCount, estimatedSlackFt } = computeEstimatedSlack(mapDistanceFt, s);
    const scenarioOffsetsFt = computeScenarioOffsets(scenario, s);
    const fixedAddedSlackFt = Number(s.fixedAddedSlackFt) || 0;
    const totalAdjustmentFt = estimatedSlackFt + fixedAddedSlackFt + scenarioOffsetsFt;

    return {
        locationCount,
        estimatedSlackFt,
        scenarioOffsetsFt,
        fixedAddedSlackFt,
        totalAdjustmentFt
    };
}

/**
 * @param {number} otdrDistanceFt
 * @param {object} settings
 * @param {string} scenario
 * @param {number} [mapDistanceForSlackEstimate]
 */
export function otdrToMapDistance(otdrDistanceFt, settings = {}, scenario = SCENARIOS.CUSTOM, mapDistanceForSlackEstimate = null) {
    const estimateBase = mapDistanceForSlackEstimate ?? Math.max(0, otdrDistanceFt);
    const slack = computeTotalSlackAdjustment(estimateBase, settings, scenario);
    const mapDistanceFt = otdrDistanceFt - slack.totalAdjustmentFt;
    return { mapDistanceFt, ...slack };
}

/**
 * @param {number} mapDistanceFt
 * @param {object} settings
 * @param {string} scenario
 */
export function mapToOtdrDistance(mapDistanceFt, settings = {}, scenario = SCENARIOS.CUSTOM) {
    const slack = computeTotalSlackAdjustment(mapDistanceFt, settings, scenario);
    const otdrDistanceFt = mapDistanceFt + slack.totalAdjustmentFt;
    return { otdrDistanceFt, ...slack };
}

/**
 * @param {import('geojson').Feature} lineFeature
 * @param {string} direction
 * @returns {import('geojson').Feature<import('geojson').LineString>}
 */
export function applyDirection(lineFeature, direction) {
    if (!lineFeature?.geometry) {
        throw new Error('Route line is required.');
    }

    const shouldReverse = direction === DIRECTIONS.FROM_END || direction === DIRECTIONS.REVERSE;
    const g = lineFeature.geometry;

    if (g.type === 'LineString') {
        const coords = g.coordinates || [];
        return {
            type: 'Feature',
            properties: { ...(lineFeature.properties || {}) },
            geometry: {
                type: 'LineString',
                coordinates: shouldReverse ? [...coords].reverse() : coords
            }
        };
    }

    if (g.type === 'MultiLineString') {
        const parts = (g.coordinates || []).map((coords) => (
            shouldReverse ? [...coords].reverse() : coords
        ));
        const orderedParts = shouldReverse ? [...parts].reverse() : parts;
        return {
            type: 'Feature',
            properties: { ...(lineFeature.properties || {}) },
            geometry: { type: 'MultiLineString', coordinates: orderedParts }
        };
    }

    throw new Error('Route must be a LineString or MultiLineString.');
}

/**
 * @param {import('geojson').Position} a
 * @param {import('geojson').Position} b
 * @param {number} toleranceFt
 */
function endpointsNear(a, b, toleranceFt) {
    if (typeof turf === 'undefined') throw new Error('Turf.js not loaded');
    return turf.distance(turf.point(a), turf.point(b), { units: 'feet' }) <= toleranceFt;
}

/**
 * @param {import('geojson').Feature<import('geojson').LineString>} line
 */
function getLineEndpoints(line) {
    const coords = line.geometry?.coordinates || [];
    if (coords.length < 2) return null;
    return { start: coords[0], end: coords[coords.length - 1] };
}

/**
 * @param {import('geojson').Feature<import('geojson').LineString>[]} lines
 * @param {number} [toleranceFt]
 */
function chainLines(lines, toleranceFt = MERGE_TOLERANCE_FT) {
    if (!lines.length) return { coords: [], warnings: ['No line segments to merge.'] };

    const remaining = lines.map((line) => ({
        coords: [...(line.geometry?.coordinates || [])],
        used: false
    })).filter((entry) => entry.coords.length >= 2);

    if (!remaining.length) {
        return { coords: [], warnings: ['No valid line segments to merge.'] };
    }

    const warnings = [];
    let current = remaining.shift();
    let merged = [...current.coords];

    while (remaining.length) {
        const tail = merged[merged.length - 1];
        let found = false;

        for (let i = 0; i < remaining.length; i++) {
            const candidate = remaining[i];
            const head = candidate.coords[0];
            const end = candidate.coords[candidate.coords.length - 1];

            if (endpointsNear(tail, head, toleranceFt)) {
                merged.push(...candidate.coords.slice(1));
                remaining.splice(i, 1);
                found = true;
                break;
            }
            if (endpointsNear(tail, end, toleranceFt)) {
                merged.push(...candidate.coords.slice(0, -1).reverse());
                remaining.splice(i, 1);
                found = true;
                break;
            }
        }

        if (!found) {
            const next = remaining.shift();
            warnings.push('Selected line segments do not all connect cleanly; only connected groups were merged.');
            if (endpointsNear(merged[merged.length - 1], next.coords[0], toleranceFt)) {
                merged.push(...next.coords.slice(1));
            } else if (endpointsNear(merged[merged.length - 1], next.coords[next.coords.length - 1], toleranceFt)) {
                merged.push(...next.coords.slice(0, -1).reverse());
            } else {
                warnings.push('Some selected segments could not be connected and were skipped.');
                remaining.unshift(next);
                break;
            }
        }
    }

    if (remaining.length) {
        warnings.push(`${remaining.length} segment(s) could not be connected and were skipped.`);
    }

    return { coords: merged, warnings };
}

/**
 * @param {import('geojson').Feature[]} features
 * @param {number} [toleranceFt]
 */
export function tryMergeConnectedLines(features, toleranceFt = MERGE_TOLERANCE_FT) {
    const lines = [];
    for (const feature of features || []) {
        const g = feature?.geometry;
        if (!g) continue;
        if (g.type === 'LineString') {
            lines.push({
                type: 'Feature',
                properties: { ...(feature.properties || {}) },
                geometry: { type: 'LineString', coordinates: g.coordinates }
            });
        } else if (g.type === 'MultiLineString') {
            for (const coords of g.coordinates || []) {
                lines.push({
                    type: 'Feature',
                    properties: { ...(feature.properties || {}) },
                    geometry: { type: 'LineString', coordinates: coords }
                });
            }
        }
    }

    if (!lines.length) {
        return { ok: false, error: 'No line features found in selection.', warnings: [] };
    }

    if (lines.length === 1) {
        return { ok: true, routeLine: lines[0], warnings: [] };
    }

    const { coords, warnings } = chainLines(lines, toleranceFt);
    if (!coords || coords.length < 2) {
        return { ok: false, error: 'Could not build a usable route from selected lines.', warnings };
    }

    return {
        ok: true,
        routeLine: {
            type: 'Feature',
            properties: { merged: true, segmentCount: lines.length },
            geometry: { type: 'LineString', coordinates: coords }
        },
        warnings
    };
}

/**
 * @param {import('geojson').Feature[]} features
 * @param {string} direction
 */
export function buildRouteFromSelection(features, direction = DIRECTIONS.FROM_START) {
    const merge = tryMergeConnectedLines(features);
    if (!merge.ok) {
        return merge;
    }

    const routeLine = applyDirection(merge.routeLine, direction);
    const routeLengthFt = lineLengthAny(routeLine, 'feet');

    return {
        ok: true,
        routeLine,
        routeLengthFt,
        warnings: merge.warnings || []
    };
}

/**
 * @param {import('geojson').Feature} routeLine
 * @param {number} distanceFt
 */
export function pointAtDistance(routeLine, distanceFt) {
    if (typeof turf === 'undefined') throw new Error('Turf.js not loaded');
    const lengthFt = lineLengthAny(routeLine, 'feet');
    const clamped = Math.max(0, Math.min(distanceFt, lengthFt));
    return turf.along(routeLine, clamped, { units: 'feet' });
}

/**
 * @param {import('geojson').Feature} routeLine
 * @param {number} distanceFt
 */
export function clipRouteToDistance(routeLine, distanceFt) {
    const lengthFt = lineLengthAny(routeLine, 'feet');
    const clamped = Math.max(0, Math.min(distanceFt, lengthFt));
    if (clamped <= 0) {
        const start = pointAtDistance(routeLine, 0);
        return {
            type: 'Feature',
            properties: { ...(routeLine.properties || {}) },
            geometry: { type: 'LineString', coordinates: [start.geometry.coordinates, start.geometry.coordinates] }
        };
    }
    return lineSliceAlongRoute(routeLine, 0, clamped, 'feet');
}

/**
 * @param {object} input
 */
export function validateSlackSettings(settings = {}) {
    const errors = [];
    const s = normalizeSlackSettings(settings);
    const numericFields = [
        ['slackPerLocationFt', 'Slack per location'],
        ['spacingFt', 'Spacing between slack locations'],
        ['fixedAddedSlackFt', 'Fixed added slack'],
        ['launchCableFt', 'Launch cable length'],
        ['receiveCableFt', 'Receive cable length'],
        ['panelJumperFt', 'Panel jumper length'],
        ['cabinetJumperFt', 'Cabinet jumper length'],
        ['buildingPassThroughJumperFt', 'Building pass-through jumper length']
    ];

    for (const [key, label] of numericFields) {
        const val = Number(s[key]);
        if (!Number.isFinite(val) || val < 0) {
            errors.push(`${label} must be a valid number greater than or equal to zero.`);
        }
    }

    if (s.manualSlackLocations != null) {
        const count = Number(s.manualSlackLocations);
        if (!Number.isFinite(count) || count < 0) {
            errors.push('Manual number of slack locations must be zero or greater.');
        }
    }

    return errors;
}

/**
 * @param {object} input
 */
export function validateWorkflowInput(input = {}) {
    const errors = [];
    const warnings = [];
    const {
        workflow,
        layerId,
        features = [],
        inputDistance,
        inputUnit = 'feet',
        slackSettings = {},
        scenario = SCENARIOS.CUSTOM,
        routeLengthFt,
        mapDistanceFt,
        otdrDistanceFt,
        clickDistanceFt,
        nearLineDistanceFt
    } = input;

    errors.push(...validateSlackSettings(slackSettings));

    if (!workflow || !Object.values(WORKFLOWS).includes(workflow)) {
        errors.push('Choose a workflow.');
    }

    if (workflow !== WORKFLOWS.CALCULATOR) {
        if (!layerId) errors.push('Select a line layer.');
        if (!features.length) errors.push('Select at least one line feature on the map.');
    }

    if (workflow === WORKFLOWS.CALCULATOR || workflow === WORKFLOWS.PLOT_OTDR) {
        const dist = Number(inputDistance);
        if (!Number.isFinite(dist) || dist <= 0) {
            errors.push('Enter a distance greater than zero.');
        }
        if (!UNIT_LABELS.some((u) => u.value === inputUnit)) {
            errors.push('Select a valid unit.');
        }
    }

    if (workflow === WORKFLOWS.PLOT_OTDR) {
        const otdrFt = otdrDistanceFt ?? distanceToFeet(Number(inputDistance), inputUnit);
        const slack = computeTotalSlackAdjustment(otdrFt, slackSettings, scenario);
        const mapFt = otdrFt - slack.totalAdjustmentFt;

        if (mapFt < 0) {
            warnings.push('The estimated slack is greater than the entered OTDR distance. Check your slack settings or input distance.');
        }
        if (Number.isFinite(routeLengthFt) && mapFt > routeLengthFt + 0.01) {
            warnings.push('The calculated distance is longer than the selected route. Check the selected route, direction, slack settings, or input distance.');
        }
    }

    if (workflow === WORKFLOWS.GET_OTDR) {
        if (clickDistanceFt == null) {
            errors.push('Click a point on the selected route.');
        }
        if (Number.isFinite(nearLineDistanceFt) && nearLineDistanceFt > NEAR_LINE_FT) {
            errors.push(`Clicked point is too far from the route (>${NEAR_LINE_FT} ft). Click closer to the line.`);
        }
    }

    if (workflow === WORKFLOWS.CALCULATOR) {
        // no extra map validation
    }

    return { ok: errors.length === 0, errors, warnings };
}

/**
 * @param {object} params
 */
export function runCalculatorWorkflow(params = {}) {
    const {
        inputDistance,
        inputUnit = 'feet',
        inputType = 'map',
        slackSettings = {},
        scenario = SCENARIOS.CUSTOM
    } = params;

    const validation = validateWorkflowInput({
        workflow: WORKFLOWS.CALCULATOR,
        inputDistance,
        inputUnit,
        slackSettings,
        scenario
    });
    if (!validation.ok) {
        return { ok: false, errors: validation.errors, warnings: validation.warnings };
    }

    const inputFt = distanceToFeet(Number(inputDistance), inputUnit);
    let mapDistanceFt;
    let otdrDistanceFt;
    let slack;

    if (inputType === 'otdr') {
        otdrDistanceFt = inputFt;
        slack = otdrToMapDistance(otdrDistanceFt, slackSettings, scenario);
        mapDistanceFt = slack.mapDistanceFt;
    } else {
        mapDistanceFt = inputFt;
        slack = mapToOtdrDistance(mapDistanceFt, slackSettings, scenario);
        otdrDistanceFt = slack.otdrDistanceFt;
    }

    const result = formatResultSummary({
        workflow: WORKFLOWS.CALCULATOR,
        inputDistance: Number(inputDistance),
        inputUnit,
        inputType,
        scenario,
        direction: null,
        mapDistanceFt,
        otdrDistanceFt,
        estimatedSlackFt: slack.estimatedSlackFt,
        totalAdjustmentFt: slack.totalAdjustmentFt,
        scenarioOffsetsFt: slack.scenarioOffsetsFt,
        fixedAddedSlackFt: slack.fixedAddedSlackFt,
        locationCount: slack.locationCount,
        routeLengthFt: null,
        sourceLayer: null,
        sourceFeatureIds: [],
        warnings: validation.warnings
    });

    return { ok: true, result, warnings: validation.warnings };
}

/**
 * @param {object} params
 */
export function computePlotOnMapResult(params = {}) {
    const {
        routeLine,
        routeLengthFt,
        inputDistance,
        inputUnit = 'feet',
        slackSettings = {},
        scenario = SCENARIOS.CUSTOM,
        direction = DIRECTIONS.FROM_START,
        sourceLayer = null,
        sourceFeatureIds = []
    } = params;

    const otdrDistanceFt = distanceToFeet(Number(inputDistance), inputUnit);
    const slack = otdrToMapDistance(otdrDistanceFt, slackSettings, scenario, otdrDistanceFt);
    const mapDistanceFt = slack.mapDistanceFt;

    const validation = validateWorkflowInput({
        workflow: WORKFLOWS.PLOT_OTDR,
        layerId: sourceLayer || 'route',
        features: [{}],
        inputDistance,
        inputUnit,
        slackSettings,
        scenario,
        routeLengthFt,
        otdrDistanceFt,
        mapDistanceFt
    });

    if (!validation.ok) {
        return { ok: false, errors: validation.errors, warnings: validation.warnings };
    }

    const plotPoint = pointAtDistance(routeLine, mapDistanceFt);
    const clippedLine = clipRouteToDistance(routeLine, mapDistanceFt);

    const result = formatResultSummary({
        workflow: WORKFLOWS.PLOT_OTDR,
        inputDistance: Number(inputDistance),
        inputUnit,
        inputType: 'otdr',
        scenario,
        direction,
        mapDistanceFt,
        otdrDistanceFt,
        estimatedSlackFt: slack.estimatedSlackFt,
        totalAdjustmentFt: slack.totalAdjustmentFt,
        scenarioOffsetsFt: slack.scenarioOffsetsFt,
        fixedAddedSlackFt: slack.fixedAddedSlackFt,
        locationCount: slack.locationCount,
        routeLengthFt,
        sourceLayer,
        sourceFeatureIds,
        plotPoint,
        clippedLine,
        routeLine,
        warnings: validation.warnings
    });

    return { ok: true, result, warnings: validation.warnings };
}

/**
 * @param {object} params
 */
export function computeClickOnMapResult(params = {}) {
    const {
        routeLine,
        routeLengthFt,
        clickLocationFt,
        nearLineDistanceFt,
        slackSettings = {},
        scenario = SCENARIOS.CUSTOM,
        direction = DIRECTIONS.FROM_START,
        sourceLayer = null,
        sourceFeatureIds = []
    } = params;

    const mapDistanceFt = Number(clickLocationFt);
    const validation = validateWorkflowInput({
        workflow: WORKFLOWS.GET_OTDR,
        layerId: sourceLayer || 'route',
        features: [{}],
        clickDistanceFt: mapDistanceFt,
        nearLineDistanceFt,
        slackSettings,
        scenario,
        routeLengthFt
    });

    if (!validation.ok) {
        return { ok: false, errors: validation.errors, warnings: validation.warnings };
    }

    const slack = mapToOtdrDistance(mapDistanceFt, slackSettings, scenario);
    const otdrDistanceFt = slack.otdrDistanceFt;
    const plotPoint = pointAtDistance(routeLine, mapDistanceFt);
    const clippedLine = clipRouteToDistance(routeLine, mapDistanceFt);

    const result = formatResultSummary({
        workflow: WORKFLOWS.GET_OTDR,
        inputDistance: mapDistanceFt,
        inputUnit: 'feet',
        inputType: 'map',
        scenario,
        direction,
        mapDistanceFt,
        otdrDistanceFt,
        estimatedSlackFt: slack.estimatedSlackFt,
        totalAdjustmentFt: slack.totalAdjustmentFt,
        scenarioOffsetsFt: slack.scenarioOffsetsFt,
        fixedAddedSlackFt: slack.fixedAddedSlackFt,
        locationCount: slack.locationCount,
        routeLengthFt,
        sourceLayer,
        sourceFeatureIds,
        plotPoint,
        clippedLine,
        routeLine,
        warnings: validation.warnings
    });

    return { ok: true, result, warnings: validation.warnings };
}

/**
 * @param {object} result
 */
export function formatResultSummary(result = {}) {
    const {
        workflow,
        inputDistance,
        inputUnit,
        inputType,
        scenario,
        direction,
        mapDistanceFt,
        otdrDistanceFt,
        estimatedSlackFt,
        totalAdjustmentFt,
        scenarioOffsetsFt,
        fixedAddedSlackFt,
        locationCount,
        routeLengthFt,
        sourceLayer,
        sourceFeatureIds = [],
        plotPoint,
        clippedLine,
        routeLine,
        warnings = []
    } = result;

    const scenarioLabel = SCENARIO_OPTIONS.find((s) => s.value === scenario)?.label ?? scenario;
    const workflowLabel = WORKFLOW_OPTIONS.find((w) => w.value === workflow)?.label ?? workflow;
    const directionLabel = DIRECTION_OPTIONS.find((d) => d.value === direction)?.label ?? direction;

    return {
        workflow,
        workflowLabel,
        inputDistance,
        inputUnit,
        inputType,
        scenario,
        scenarioLabel,
        direction,
        directionLabel,
        mapDistanceFt,
        otdrDistanceFt,
        estimatedSlackFt,
        totalAdjustmentFt,
        scenarioOffsetsFt,
        fixedAddedSlackFt,
        locationCount,
        routeLengthFt,
        sourceLayer,
        sourceFeatureIds,
        plotPoint,
        clippedLine,
        routeLine,
        warnings,
        units: {
            input: convertToAllUnits(inputType === 'otdr' ? distanceToFeet(inputDistance, inputUnit) : distanceToFeet(inputDistance, inputUnit)),
            mapDistance: convertToAllUnits(mapDistanceFt),
            otdrDistance: convertToAllUnits(otdrDistanceFt),
            estimatedSlack: convertToAllUnits(estimatedSlackFt),
            totalAdjustment: convertToAllUnits(totalAdjustmentFt),
            routeLength: routeLengthFt != null ? convertToAllUnits(routeLengthFt) : null
        }
    };
}

/**
 * @param {object} result
 * @param {object} [meta]
 */
export function buildOutputFeatureCollection(result, meta = {}) {
    const features = [];
    const baseProps = {
        workflow_type: result.workflow,
        input_distance: result.inputDistance,
        input_unit: result.inputUnit,
        map_distance_ft: result.mapDistanceFt,
        otdr_distance_ft: result.otdrDistanceFt,
        estimated_slack_ft: result.estimatedSlackFt,
        total_adjustment_ft: result.totalAdjustmentFt,
        direction: result.direction,
        scenario: result.scenario,
        source_layer: result.sourceLayer,
        source_feature_ids: (result.sourceFeatureIds || []).join(','),
        created_at: meta.createdAt || new Date().toISOString(),
        notes: meta.notes || ''
    };

    if (result.clippedLine) {
        features.push({
            ...result.clippedLine,
            properties: {
                ...(result.clippedLine.properties || {}),
                ...baseProps,
                feature_role: 'measured_route'
            }
        });
    }

    if (result.plotPoint) {
        features.push({
            ...result.plotPoint,
            properties: {
                ...(result.plotPoint.properties || {}),
                ...baseProps,
                feature_role: 'result_point'
            }
        });
    }

    if (result.routeLine) {
        features.push({
            ...result.routeLine,
            properties: {
                ...(result.routeLine.properties || {}),
                ...baseProps,
                feature_role: 'source_route_copy'
            }
        });
    }

    return { type: 'FeatureCollection', features };
}

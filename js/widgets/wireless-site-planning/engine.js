import * as turf from '@turf/turf';

export const UNIT_LABELS = [
    { value: 'feet', label: 'Feet', abbr: 'ft' },
    { value: 'meters', label: 'Meters', abbr: 'm' },
    { value: 'miles', label: 'Miles', abbr: 'mi' },
    { value: 'kilometers', label: 'Kilometers', abbr: 'km' }
];

export const SECTOR_WIDTH_OPTIONS = [30, 45, 60, 90, 120, 180, 360];
export const OPTIMIZATION_GOALS = ['cover_most', 'fewest_poles', 'fewest_antennas', 'balanced'];
export const SECTOR_WIDTH_MODES = ['fixed', 'auto_fit'];

export const GOAL_PENALTIES = {
    cover_most: { pole: 0, antenna: 0 },
    fewest_poles: { pole: 2, antenna: 0.25 },
    fewest_antennas: { pole: 0.5, antenna: 1 },
    balanced: { pole: 1, antenna: 0.5 }
};

export const POLE_SECTOR_FIELD_KEYS = [
    'antenna_count',
    'antenna_1_enabled', 'antenna_1_azimuth', 'antenna_1_sector_width', 'antenna_1_range', 'antenna_1_label',
    'antenna_2_enabled', 'antenna_2_azimuth', 'antenna_2_sector_width', 'antenna_2_range', 'antenna_2_label'
];

/** CSV columns for importing client and pole locations in one file. */
export const WIRELESS_LOCATIONS_CSV_COLUMNS = [
    'location_type',
    'name',
    'latitude',
    'longitude'
];

const LOCATION_TYPE_FIELD_KEYS = ['location_type', 'type', 'point_type'];

/** Sample rows along I-15 in Salt Lake City, Utah (clients + poles). */
export const WIRELESS_LOCATIONS_CSV_SAMPLE_ROWS = [
    {
        location_type: 'client',
        name: 'I-15 @ 600 South',
        latitude: 40.7521,
        longitude: -111.8982
    },
    {
        location_type: 'client',
        name: 'I-15 @ 2100 South',
        latitude: 40.7248,
        longitude: -111.8714
    },
    {
        location_type: 'client',
        name: 'Downtown Salt Lake City',
        latitude: 40.7608,
        longitude: -111.8910
    },
    {
        location_type: 'client',
        name: 'I-15 @ 3300 South',
        latitude: 40.7043,
        longitude: -111.8588
    },
    {
        location_type: 'client',
        name: 'Murray - near I-15',
        latitude: 40.6669,
        longitude: -111.8878
    },
    {
        location_type: 'pole',
        name: 'Pole A - 600 South',
        latitude: 40.7535,
        longitude: -111.8970
    },
    {
        location_type: 'pole',
        name: 'Pole B - Downtown',
        latitude: 40.7615,
        longitude: -111.8900
    },
    {
        location_type: 'pole',
        name: 'Pole C - Murray',
        latitude: 40.6678,
        longitude: -111.8865
    }
];

function escapeCsvCell(value) {
    const text = value == null ? '' : String(value);
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export function buildWirelessLocationsCsvTemplate(rows = WIRELESS_LOCATIONS_CSV_SAMPLE_ROWS) {
    const lines = [WIRELESS_LOCATIONS_CSV_COLUMNS.join(',')];
    rows.forEach((row) => {
        lines.push(WIRELESS_LOCATIONS_CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(','));
    });
    return `${lines.join('\r\n')}\r\n`;
}

function readLocationType(props = {}) {
    for (const key of LOCATION_TYPE_FIELD_KEYS) {
        const value = props[key];
        if (value != null && String(value).trim() !== '') {
            return String(value).trim().toLowerCase();
        }
    }
    return null;
}

export function splitFeaturesByLocationType(features = []) {
    const clients = [];
    const poles = [];
    const invalid = [];

    features.forEach((feature, index) => {
        const locationType = readLocationType(feature?.properties || {});
        if (locationType === 'client') {
            clients.push(feature);
        } else if (locationType === 'pole') {
            poles.push(feature);
        } else {
            invalid.push({
                index,
                reason: locationType ? 'unknown_location_type' : 'missing_location_type',
                value: locationType
            });
        }
    });

    return {
        clients,
        poles,
        invalid,
        unknownTypeCount: invalid.filter((entry) => entry.reason === 'unknown_location_type').length
    };
}

export function unitAbbr(unit) {
    return UNIT_LABELS.find((entry) => entry.value === unit)?.abbr ?? unit;
}

export function distanceToMeters(value, units) {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) return Infinity;
    switch (units) {
        case 'feet':
            return num / 3.28084;
        case 'kilometers':
            return num * 1000;
        case 'miles':
            return num / 0.000621371;
        default:
            return num;
    }
}

export const DEFAULT_SECTOR_WIDTH = 45;

/**
 * Forward side lobes (display only).
 * Positive offsets only — bearing trace uses symmetric angleDelta from boresight.
 * Narrow widths + wider spacing so three distinct bumps appear per side.
 */
export const RADIATION_SIDE_LOBES = [
    { offset: 53, peakDb: -11, width: 3.5 },
    { offset: 69, peakDb: -9, width: 4 },
    { offset: 85, peakDb: -12, width: 3.5 }
];

/** Back-lobe petals — kept minimal so rear response is nearly suppressed (display only). */
export const RADIATION_BACK_PETALS = [];

export const LOBE_PATTERN_DEFAULTS = {
    radialSteps: 14,
    angularSteps: 48,
    signalThreshold: 0.025,
    outlineSteps: 180,
    /** Minimum radius fraction in nulls — keeps outline smooth without a visible back lobe. */
    outlineMinRadiusFactor: 0.002
};

/** Display-only — main lobe beamwidth as fraction of sector width (lower = skinnier). */
const MAIN_LOBE_PATTERN_HPBW_FACTOR = 0.42;
/** Cap display HPBW so side lobes are never swallowed by the main lobe skirt. */
const MAIN_LOBE_PATTERN_MAX_HPBW = 22;
/** Extra main-lobe sharpness for the radiation pattern trace (display only). */
const MAIN_LOBE_PATTERN_SHARPNESS = 1.35;
/** Elliptical tip blend — fraction of half-beamwidth (higher = rounder far tip). */
const MAIN_LOBE_TIP_ROUND_SIGMA = 0.72;

function dbToLinear(db) {
    return Math.pow(10, db / 10);
}

function petalGain(relativeAngleDeg, centerOffset, peakDb, widthDeg) {
    const delta = Math.abs(relativeAngleDeg - Math.abs(centerOffset));
    return dbToLinear(peakDb) * Math.exp(-0.5 * Math.pow(delta / widthDeg, 2));
}

function mainLobeEllipticalGain(absRelDeg, halfDeg) {
    if (absRelDeg >= halfDeg * 1.05) return 0;
    const relRad = absRelDeg * (Math.PI / 180);
    const halfRad = halfDeg * (Math.PI / 180);
    const sinHalf = Math.sin(Math.max(halfRad, 0.03));
    const sinRel = Math.sin(Math.min(relRad, (Math.PI / 2) - 0.02));
    const ratio = sinRel / sinHalf;
    return Math.sqrt(Math.max(0, 1 - ratio * ratio));
}

function mainLobeLinearGain(relativeAngleDeg, sectorWidth) {
    const hpbw = Math.min(
        Math.max(sectorWidth * MAIN_LOBE_PATTERN_HPBW_FACTOR, 10),
        MAIN_LOBE_PATTERN_MAX_HPBW
    );
    const halfDeg = hpbw / 2;
    const halfRad = halfDeg * (Math.PI / 180);
    const cosHalf = Math.cos(halfRad);
    const n = (cosHalf > 0.01 ? Math.log(0.5) / Math.log(cosHalf) : 8) * MAIN_LOBE_PATTERN_SHARPNESS;
    const relRad = relativeAngleDeg * (Math.PI / 180);
    const cosVal = Math.cos(relRad);
    if (Math.abs(relativeAngleDeg) >= 92 || cosVal <= 0) return 0;

    const absRel = Math.abs(relativeAngleDeg);
    const cosGain = Math.pow(cosVal, Math.max(n, 2));
    const ellGain = mainLobeEllipticalGain(absRel, halfDeg);
    const sigma = halfDeg * MAIN_LOBE_TIP_ROUND_SIGMA;
    const roundWeight = Math.exp(-0.5 * Math.pow(absRel / sigma, 2));

    return Math.min(1, cosGain * (1 - roundWeight) + ellGain * roundWeight);
}

/** Linear gain (0–1) — envelope of main lobe + side/back petal lobes. */
export function radiationPatternGain(relativeAngleDeg, sectorWidth = DEFAULT_SECTOR_WIDTH) {
    let linear = mainLobeLinearGain(relativeAngleDeg, sectorWidth);

    for (const lobe of RADIATION_SIDE_LOBES) {
        linear = Math.max(linear, petalGain(relativeAngleDeg, lobe.offset, lobe.peakDb, lobe.width));
    }

    for (const lobe of RADIATION_BACK_PETALS) {
        linear = Math.max(linear, petalGain(relativeAngleDeg, lobe.offset, lobe.peakDb, lobe.width));
    }

    return Math.min(1, linear);
}

/** Gain in dB relative to boresight (0 dB = peak). For future gradient styling. */
export function radiationPatternGainDb(relativeAngleDeg, sectorWidth = DEFAULT_SECTOR_WIDTH) {
    const linear = radiationPatternGain(relativeAngleDeg, sectorWidth);
    if (linear <= 1e-6) return -40;
    return Math.max(-40, 10 * Math.log10(linear));
}

/** Combined angular + radial signal strength for heatmap sampling (display only). */
export function signalStrengthAt(relativeAngleDeg, distance, range, sectorWidth = DEFAULT_SECTOR_WIDTH) {
    const angularGain = radiationPatternGain(relativeAngleDeg, sectorWidth);
    const radialGain = Math.max(0, 1 - Math.pow(distance / range, 1.35));
    return angularGain * radialGain;
}

export function createDefaultPoleSectorAttributes(defaultRange = 1, defaultWidth = DEFAULT_SECTOR_WIDTH, units = 'miles') {
    return {
        antenna_count: 1,
        antenna_1_enabled: true,
        antenna_1_azimuth: 0,
        antenna_1_sector_width: defaultWidth,
        antenna_1_range: defaultRange,
        antenna_1_label: 'Sector A',
        antenna_2_enabled: false,
        antenna_2_azimuth: 180,
        antenna_2_sector_width: defaultWidth,
        antenna_2_range: defaultRange,
        antenna_2_label: 'Sector B',
        _range_units: units
    };
}

function extractPointCoords(feature) {
    const geom = feature?.geometry;
    if (!geom) return null;
    if (geom.type === 'Point') return geom.coordinates;
    if (geom.type === 'MultiPoint' && geom.coordinates?.length) return geom.coordinates[0];
    return null;
}

function hasExistingSectorAttributes(props = {}) {
    return POLE_SECTOR_FIELD_KEYS.some((key) => props[key] != null && props[key] !== '');
}

function normalizeAngle(angle) {
    let a = angle % 360;
    if (a < 0) a += 360;
    return a;
}

function angleDelta(from, to) {
    const diff = Math.abs(normalizeAngle(to) - normalizeAngle(from));
    return diff > 180 ? 360 - diff : diff;
}

function isWithinSectorWedge(bearingToClient, azimuth, sectorWidth) {
    if (sectorWidth >= 360) return true;
    return angleDelta(bearingToClient, azimuth) <= sectorWidth / 2;
}

function pickName(props = {}) {
    return props.name || props.title || props.label || props.Name || props.TITLE || '';
}

function pickId(props = {}, fallback) {
    return props.id ?? props.client_id ?? props.pole_id ?? props.ID ?? fallback;
}

export function normalizeClientPoints(features = []) {
    const valid = [];
    const invalid = [];

    features.forEach((feature, index) => {
        const coords = extractPointCoords(feature);
        const props = feature?.properties || {};
        if (!coords) {
            invalid.push({ index, reason: 'not_a_point' });
            return;
        }
        const [lon, lat] = coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            invalid.push({ index, reason: 'invalid_coordinates' });
            return;
        }
        valid.push({
            id: String(pickId(props, `client-${index}`)),
            name: pickName(props),
            lat,
            lon,
            coverage_status: 'unknown',
            assigned_pole_id: null,
            assigned_sector_id: null,
            feature,
            featureIndex: index
        });
    });

    return { valid, invalid, total: features.length };
}

export function normalizePolePoints(features = [], defaults = {}) {
    const valid = [];
    const invalid = [];
    let withExistingAttrs = 0;
    let usingDefaults = 0;

    const defaultAttrs = createDefaultPoleSectorAttributes(
        defaults.defaultRange ?? 1,
        defaults.defaultWidth ?? DEFAULT_SECTOR_WIDTH,
        defaults.units ?? 'miles'
    );

    features.forEach((feature, index) => {
        const coords = extractPointCoords(feature);
        const props = feature?.properties || {};
        if (!coords) {
            invalid.push({ index, reason: 'not_a_point' });
            return;
        }
        const [lon, lat] = coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            invalid.push({ index, reason: 'invalid_coordinates' });
            return;
        }

        const hasAttrs = hasExistingSectorAttributes(props);
        if (hasAttrs) withExistingAttrs += 1;
        else usingDefaults += 1;

        const sectorDefaults = hasAttrs ? {} : defaultAttrs;

        valid.push({
            id: String(pickId(props, `pole-${index}`)),
            name: pickName(props),
            lat,
            lon,
            antenna_count: parseInt(props.antenna_count ?? sectorDefaults.antenna_count ?? 1, 10) || 1,
            antenna_1_enabled: props.antenna_1_enabled ?? sectorDefaults.antenna_1_enabled ?? true,
            antenna_1_azimuth: parseFloat(props.antenna_1_azimuth ?? sectorDefaults.antenna_1_azimuth ?? 0) || 0,
            antenna_1_sector_width: parseFloat(props.antenna_1_sector_width ?? sectorDefaults.antenna_1_sector_width ?? defaults.defaultWidth ?? DEFAULT_SECTOR_WIDTH) || DEFAULT_SECTOR_WIDTH,
            antenna_1_range: parseFloat(props.antenna_1_range ?? sectorDefaults.antenna_1_range ?? defaults.defaultRange ?? 1) || 1,
            antenna_1_label: props.antenna_1_label ?? sectorDefaults.antenna_1_label ?? 'Sector A',
            antenna_2_enabled: props.antenna_2_enabled ?? sectorDefaults.antenna_2_enabled ?? false,
            antenna_2_azimuth: parseFloat(props.antenna_2_azimuth ?? sectorDefaults.antenna_2_azimuth ?? 180) || 180,
            antenna_2_sector_width: parseFloat(props.antenna_2_sector_width ?? sectorDefaults.antenna_2_sector_width ?? defaults.defaultWidth ?? DEFAULT_SECTOR_WIDTH) || DEFAULT_SECTOR_WIDTH,
            antenna_2_range: parseFloat(props.antenna_2_range ?? sectorDefaults.antenna_2_range ?? defaults.defaultRange ?? 1) || 1,
            antenna_2_label: props.antenna_2_label ?? sectorDefaults.antenna_2_label ?? 'Sector B',
            hasExistingAttrs: hasAttrs,
            feature,
            featureIndex: index
        });
    });

    return {
        valid,
        invalid,
        total: features.length,
        withExistingAttrs,
        usingDefaults
    };
}

export function validateWirelessPlanningInputs({ clients = [], poles = [], settings = {} } = {}) {
    const errors = [];
    const warnings = [];

    if (!clients.length) {
        errors.push('Add at least one client point (locations that need coverage).');
    }
    if (!poles.length) {
        errors.push('Add at least one pole point (possible pole location).');
    }

    const clientNorm = normalizeClientPoints(clients);
    const poleNorm = normalizePolePoints(poles, {
        defaultRange: settings.defaultRange,
        defaultWidth: settings.defaultSectorWidth,
        units: settings.units
    });

    if (clients.length && clientNorm.valid.length === 0) {
        errors.push('No valid client point geometries found.');
    }
    if (poles.length && poleNorm.valid.length === 0) {
        errors.push('No valid pole point geometries found.');
    }

    if (clientNorm.invalid.length) {
        warnings.push(`${clientNorm.invalid.length} client feature(s) skipped (not valid points).`);
    }
    if (poleNorm.invalid.length) {
        warnings.push(`${poleNorm.invalid.length} pole feature(s) skipped (not valid points).`);
    }

    const range = parseFloat(settings.defaultRange);
    if (!Number.isFinite(range) || range <= 0) {
        errors.push('Enter a valid coverage distance.');
    }

    return {
        errors,
        warnings,
        stats: {
            totalClients: clientNorm.total,
            validClients: clientNorm.valid.length,
            invalidClients: clientNorm.invalid.length,
            totalPoles: poleNorm.total,
            validPoles: poleNorm.valid.length,
            invalidPoles: poleNorm.invalid.length,
            polesWithExistingAttrs: poleNorm.withExistingAttrs,
            polesUsingDefaults: poleNorm.usingDefaults
        },
        clientNorm,
        poleNorm
    };
}

export function calculateDistance(from, to, units = 'miles') {
    const p1 = turf.point([from.lon, from.lat]);
    const p2 = turf.point([to.lon, to.lat]);
    return turf.distance(p1, p2, { units });
}

export function calculateBearing(from, to) {
    const p1 = turf.point([from.lon, from.lat]);
    const p2 = turf.point([to.lon, to.lat]);
    return turf.bearing(p1, p2);
}

export function createSectorPolygon(pole, azimuth, width, range, units = 'miles', steps = 32) {
    const center = turf.point([pole.lon, pole.lat]);
    const half = width / 2;
    const startBearing = azimuth - half;
    const endBearing = azimuth + half;
    return turf.sector(center, range, startBearing, endBearing, { units, steps });
}

/** @deprecated Optimizer wedge helper — kept for tests. Display uses radiation pattern. */
export function lobeRangeFactor(angleDeltaDeg, sectorWidth, lobePower = 2) {
    if (sectorWidth >= 360) return 1;
    const half = sectorWidth / 2;
    if (angleDeltaDeg > half) return 0;
    if (half <= 0) return 1;
    const t = angleDeltaDeg / half;
    return Math.pow(Math.cos((Math.PI / 2) * t), lobePower);
}

/**
 * Smooth polar-pattern trace (LineString) — like a classic radiation pattern plot.
 */
export function createRadiationPatternOutline(pole, azimuth, sectorWidth, range, units = 'miles', options = {}) {
    const {
        outlineSteps = LOBE_PATTERN_DEFAULTS.outlineSteps,
        outlineMinRadiusFactor = LOBE_PATTERN_DEFAULTS.outlineMinRadiusFactor
    } = options;
    const center = turf.point([pole.lon, pole.lat]);

    if (sectorWidth >= 360) {
        const circle = turf.circle(center, range, { units, steps: Math.max(outlineSteps, 32) });
        return {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: circle.geometry.coordinates[0] },
            properties: { coverage_shape: 'radiation_pattern' }
        };
    }

    const coords = [];
    for (let i = 0; i <= outlineSteps; i++) {
        const bearing = (360 * i) / outlineSteps;
        const rel = angleDelta(bearing, azimuth);
        const gain = radiationPatternGain(rel, sectorWidth);
        const dist = range * Math.max(gain, outlineMinRadiusFactor);
        coords.push(turf.destination(center, dist, bearing, { units }).geometry.coordinates);
    }
    coords.push(coords[0]);

    return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { coverage_shape: 'radiation_pattern' }
    };
}

/** Point samples for heatmap layers — signal property 0–1. */
export function createAntennaHeatmapPoints(pole, sector, units = 'miles', options = {}) {
    const {
        radialSteps = LOBE_PATTERN_DEFAULTS.radialSteps,
        angularSteps = LOBE_PATTERN_DEFAULTS.angularSteps,
        signalThreshold = LOBE_PATTERN_DEFAULTS.signalThreshold
    } = options;
    const { azimuth, sectorWidth, range } = sector;
    const center = turf.point([pole.lon, pole.lat]);
    const features = [];

    for (let ri = 1; ri <= radialSteps; ri++) {
        const dist = (range * ri) / radialSteps;
        for (let ai = 0; ai < angularSteps; ai++) {
            const bearing = (360 * ai) / angularSteps;
            const rel = angleDelta(bearing, azimuth);
            const signal = signalStrengthAt(rel, dist, range, sectorWidth);
            if (signal < signalThreshold) continue;

            const point = turf.destination(center, dist, bearing, { units });
            features.push({
                type: 'Feature',
                geometry: point.geometry,
                properties: {
                    signal: Math.round(signal * 1000) / 1000,
                    pole_id: pole.id,
                    sector_id: sector.sectorId,
                    antenna_number: sector.antennaNumber ?? 1,
                    coverage_shape: 'heatmap'
                }
            });
        }
    }

    return features;
}

/** @deprecated Use createRadiationPatternOutline — kept for tests. */
export function createAntennaLobePolygon(pole, azimuth, width, range, units = 'miles', options = {}) {
    return createRadiationPatternOutline(pole, azimuth, width, range, units, options);
}

function buildCoverageVisualProperties(sector, pole, visualType, { preview = false } = {}) {
    const props = {
        pole_id: pole.id,
        sector_id: sector.sectorId,
        antenna_number: sector.antennaNumber ?? 1,
        azimuth: sector.azimuth,
        sector_width: sector.sectorWidth,
        range: sector.range,
        visual_type: visualType,
        coverage_shape: visualType === 'heatmap' ? 'heatmap' : 'radiation_pattern'
    };
    if (visualType === 'outline') {
        props.covered_client_count = sector.coveredClients?.length ?? 0;
    }
    if (preview) {
        props._preview = visualType === 'heatmap' ? 'coverage_heat' : 'pattern_outline';
    }
    return props;
}

/** Heatmap points + radiation pattern trace for map display. */
export function createAntennaCoverageFeatures(pole, sector, units = 'miles', options = {}) {
    const features = [];

    createAntennaHeatmapPoints(pole, sector, units, options).forEach((point) => {
        point.properties = {
            ...point.properties,
            ...buildCoverageVisualProperties(sector, pole, 'heatmap', options)
        };
        features.push(point);
    });

    const outline = createRadiationPatternOutline(
        pole,
        sector.azimuth,
        sector.sectorWidth,
        sector.range,
        units,
        options
    );
    if (outline) {
        outline.properties = buildCoverageVisualProperties(sector, pole, 'outline', options);
        features.push(outline);
    }

    return features;
}

export function isPointInsideSector(client, pole, sector, units = 'miles') {
    const dist = calculateDistance(pole, client, units);
    if (dist > sector.range) return false;
    const bearing = calculateBearing(pole, client);
    return isWithinSectorWedge(bearing, sector.azimuth, sector.sectorWidth);
}

function clientsCoveredBySector(pole, clients, sector, units) {
    const covered = [];
    for (const client of clients) {
        if (isPointInsideSector(client, pole, sector, units)) {
            covered.push(client);
        }
    }
    return covered;
}

function evaluateSectorAtAzimuth(pole, clients, azimuth, sectorWidth, range, units) {
    const sector = { azimuth, sectorWidth, range };
    const covered = clientsCoveredBySector(pole, clients, sector, units);
    return { azimuth, sectorWidth, range, covered, count: covered.length };
}

function snapSectorWidthUp(degrees) {
    const required = Math.max(0, degrees);
    for (const option of SECTOR_WIDTH_OPTIONS) {
        if (option >= required) return option;
    }
    return 360;
}

/** Minimum discrete sector width to cover clients at the given azimuth. */
export function fitSectorWidthForClients(pole, clients, azimuth) {
    if (!clients.length) return SECTOR_WIDTH_OPTIONS[0];
    const deltas = clients.map((client) => angleDelta(calculateBearing(pole, client), azimuth));
    const maxDelta = Math.max(...deltas, 0);
    return snapSectorWidthUp(maxDelta * 2 + 1);
}

function getAutoFitWidthOptions(settings = {}) {
    const options = settings.sectorWidthOptions || SECTOR_WIDTH_OPTIONS;
    if (settings.allowFullCircle === false) {
        return options.filter((width) => width < 360);
    }
    return options;
}

function findBestAutoFitSector(pole, clients, range, units, widthOptions) {
    if (!clients.length || !widthOptions.length) return null;

    let best = null;

    for (const client of clients) {
        const azimuth = calculateBearing(pole, client);
        let maxCount = 0;

        for (const width of widthOptions) {
            const covered = clientsCoveredBySector(pole, clients, { azimuth, sectorWidth: width, range }, units);
            if (covered.length > maxCount) maxCount = covered.length;
        }

        if (maxCount === 0) continue;

        let coveredAtMax = [];
        for (const width of widthOptions) {
            const covered = clientsCoveredBySector(pole, clients, { azimuth, sectorWidth: width, range }, units);
            if (covered.length === maxCount) {
                coveredAtMax = covered;
                break;
            }
        }

        let fittedWidth = fitSectorWidthForClients(pole, coveredAtMax, azimuth);
        if (fittedWidth > widthOptions[widthOptions.length - 1]) {
            fittedWidth = widthOptions[widthOptions.length - 1];
        } else if (!widthOptions.includes(fittedWidth)) {
            fittedWidth = widthOptions.find((width) => width >= fittedWidth) ?? widthOptions[widthOptions.length - 1];
        }

        const finalCovered = clientsCoveredBySector(
            pole,
            clients,
            { azimuth, sectorWidth: fittedWidth, range },
            units
        );
        if (!finalCovered.length) continue;

        const finalWidth = fitSectorWidthForClients(pole, finalCovered, azimuth);
        const snappedWidth = widthOptions.includes(finalWidth)
            ? finalWidth
            : (widthOptions.find((width) => width >= finalWidth) ?? widthOptions[widthOptions.length - 1]);
        const snappedCovered = clientsCoveredBySector(
            pole,
            clients,
            { azimuth, sectorWidth: snappedWidth, range },
            units
        );

        if (!best
            || snappedCovered.length > best.coveredClients.length
            || (snappedCovered.length === best.coveredClients.length && snappedWidth < best.sectorWidth)) {
            best = {
                azimuth,
                sectorWidth: snappedWidth,
                range,
                coveredClients: snappedCovered
            };
        }
    }

    return best;
}

function findBestDirectionForWidth(pole, clients, sectorWidth, range, units) {
    if (!clients.length) return null;

    const candidateAzimuths = clients.map((client) => calculateBearing(pole, client));
    let best = null;

    for (const azimuth of candidateAzimuths) {
        const result = evaluateSectorAtAzimuth(pole, clients, azimuth, sectorWidth, range, units);
        if (!best || result.count > best.count) {
            best = result;
        }
    }

    return best;
}

export function findBestSectorForPole(pole, uncoveredClients, settings = {}) {
    const units = settings.units || 'miles';
    const range = parseFloat(settings.defaultRange) || 1;
    const mode = settings.sectorWidthMode || 'fixed';
    const fixedWidth = parseFloat(settings.defaultSectorWidth) || DEFAULT_SECTOR_WIDTH;

    const inRange = uncoveredClients.filter((client) => calculateDistance(pole, client, units) <= range);
    if (!inRange.length) return null;

    if (mode === 'fixed') {
        const best = findBestDirectionForWidth(pole, inRange, fixedWidth, range, units);
        if (!best || best.count === 0) return null;
        return {
            azimuth: best.azimuth,
            sectorWidth: best.sectorWidth,
            range: best.range,
            coveredClients: best.covered,
            sectorId: `${pole.id}-sector-1`
        };
    }

    const widthOptions = getAutoFitWidthOptions(settings);
    const best = findBestAutoFitSector(pole, inRange, range, units, widthOptions);
    if (!best) return null;

    return {
        ...best,
        sectorId: `${pole.id}-sector-1`
    };
}

export function findBestTwoSectorsForPole(pole, uncoveredClients, settings = {}) {
    const maxAntennas = settings.maxAntennasPerPole ?? 1;
    const firstSettings = maxAntennas >= 2
        ? { ...settings, allowFullCircle: false }
        : settings;
    const first = findBestSectorForPole(pole, uncoveredClients, firstSettings);
    if (!first) return null;

    const sectors = [{
        ...first,
        antennaNumber: 1,
        sectorId: `${pole.id}-sector-a`
    }];

    if (maxAntennas < 2) {
        return {
            sectors,
            coveredClients: first.coveredClients,
            antennaCount: 1
        };
    }

    const coveredIds = new Set(first.coveredClients.map((c) => c.id));
    const remaining = uncoveredClients.filter((c) => !coveredIds.has(c.id));
    const second = findBestSectorForPole(pole, remaining, settings);

    if (second && second.coveredClients.length > 0) {
        sectors.push({
            ...second,
            antennaNumber: 2,
            sectorId: `${pole.id}-sector-b`
        });
    }

    const allCovered = [];
    const seen = new Set();
    sectors.forEach((sector) => {
        sector.coveredClients.forEach((client) => {
            if (!seen.has(client.id)) {
                seen.add(client.id);
                allCovered.push({ ...client, sectorId: sector.sectorId, antennaNumber: sector.antennaNumber });
            }
        });
    });

    return {
        sectors,
        coveredClients: allCovered,
        antennaCount: sectors.length
    };
}

export function scorePoleCandidate(newlyCovered, antennaCount, goal = 'balanced') {
    const penalties = GOAL_PENALTIES[goal] || GOAL_PENALTIES.balanced;
    return newlyCovered - penalties.pole - (penalties.antenna * antennaCount);
}

function buildSectorAssignments(pole, sector, units) {
    return sector.coveredClients.map((client) => ({
        clientId: client.id,
        client,
        poleId: pole.id,
        sectorId: sector.sectorId,
        antennaNumber: sector.antennaNumber ?? 1,
        distance: calculateDistance(pole, client, units),
        bearing: calculateBearing(pole, client)
    }));
}

export function runGreedyPoleSectorOptimization(clients = [], poles = [], settings = {}) {
    const units = settings.units || 'miles';
    const goal = settings.optimizationGoal || 'balanced';
    const maxAntennas = settings.maxAntennasPerPole ?? 1;

    const uncovered = new Map(clients.map((c) => [c.id, c]));
    const selectedPoles = [];
    const allAssignments = [];
    const usedPoleIds = new Set();

    while (uncovered.size > 0) {
        let bestCandidate = null;
        let bestScore = -Infinity;

        for (const pole of poles) {
            if (usedPoleIds.has(pole.id)) continue;

            const uncoveredList = [...uncovered.values()];
            const poleResult = findBestTwoSectorsForPole(pole, uncoveredList, { ...settings, maxAntennasPerPole: maxAntennas });
            if (!poleResult || poleResult.coveredClients.length === 0) continue;

            const newlyCovered = poleResult.coveredClients.length;
            const score = scorePoleCandidate(newlyCovered, poleResult.antennaCount, goal);

            if (score > bestScore) {
                bestScore = score;
                bestCandidate = { pole, ...poleResult, score };
            }
        }

        if (!bestCandidate || bestCandidate.coveredClients.length === 0) break;

        usedPoleIds.add(bestCandidate.pole.id);
        selectedPoles.push({
            pole: bestCandidate.pole,
            sectors: bestCandidate.sectors,
            score: bestCandidate.score,
            coveredClientCount: bestCandidate.coveredClients.length,
            antennaCount: bestCandidate.antennaCount
        });

        bestCandidate.sectors.forEach((sector) => {
            const assignments = buildSectorAssignments(bestCandidate.pole, sector, units);
            allAssignments.push(...assignments);
            sector.coveredClients.forEach((client) => uncovered.delete(client.id));
        });
    }

    const coveredClients = allAssignments.map((a) => ({
        ...a.client,
        assigned_pole_id: a.poleId,
        assigned_sector_id: a.sectorId,
        distance: a.distance,
        bearing: a.bearing,
        coverage_status: 'covered'
    }));

    const uncoveredClients = [...uncovered.values()].map((client) => {
        const inRangeOfAnyPole = poles.some((pole) => {
            const range = parseFloat(settings.defaultRange) || 1;
            return calculateDistance(pole, client, units) <= range;
        });
        return {
            ...client,
            coverage_status: 'uncovered',
            reason: inRangeOfAnyPole ? 'not_selected' : 'out_of_range'
        };
    });

    const totalClients = clients.length;
    const coveredCount = coveredClients.length;

    return {
        selectedPoles,
        assignments: allAssignments,
        coveredClients,
        uncoveredClients,
        summary: {
            totalClients,
            coveredClients: coveredCount,
            uncoveredClients: uncoveredClients.length,
            recommendedPoles: selectedPoles.length,
            recommendedAntennas: selectedPoles.reduce((sum, p) => sum + p.antennaCount, 0),
            coveragePercent: totalClients ? Math.round((coveredCount / totalClients) * 100) : 0
        }
    };
}

function lineFeature(from, to, properties = {}) {
    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [[from.lon, from.lat], [to.lon, to.lat]]
        },
        properties
    };
}

function pointFeature(record, properties = {}) {
    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [record.lon, record.lat]
        },
        properties: {
            ...(record.feature?.properties || {}),
            ...properties
        }
    };
}

export function buildWirelessPlanningOutputLayers(result, options = {}) {
    const units = options.units || 'miles';
    const includeAssignments = options.createAssignmentLines !== false;

    const recommendedPoles = {
        type: 'FeatureCollection',
        features: result.selectedPoles.map((entry) => pointFeature(entry.pole, {
            pole_id: entry.pole.id,
            pole_name: entry.pole.name,
            recommended: true,
            covered_client_count: entry.coveredClientCount,
            antenna_count: entry.antennaCount,
            score: entry.score
        }))
    };

    const sectorCoverage = {
        type: 'FeatureCollection',
        features: result.selectedPoles.flatMap((entry) =>
            entry.sectors.map((sector) => {
                const outline = createRadiationPatternOutline(
                    entry.pole,
                    sector.azimuth,
                    sector.sectorWidth,
                    sector.range,
                    units
                );
                if (!outline) return null;
                outline.properties = {
                    pole_id: entry.pole.id,
                    sector_id: sector.sectorId,
                    antenna_number: sector.antennaNumber ?? 1,
                    azimuth: sector.azimuth,
                    sector_width: sector.sectorWidth,
                    range: sector.range,
                    covered_client_count: sector.coveredClients.length,
                    coverage_shape: 'radiation_pattern'
                };
                return outline;
            }).filter(Boolean)
        )
    };

    const coverageHeatmap = {
        type: 'FeatureCollection',
        features: result.selectedPoles.flatMap((entry) =>
            entry.sectors.flatMap((sector) => createAntennaHeatmapPoints(entry.pole, sector, units))
        )
    };

    const clientAssignments = {
        type: 'FeatureCollection',
        features: includeAssignments
            ? result.assignments.map((a) => lineFeature(a.client, result.selectedPoles.find((p) => p.pole.id === a.poleId)?.pole || a.client, {
                client_id: a.clientId,
                pole_id: a.poleId,
                sector_id: a.sectorId,
                distance: a.distance,
                bearing: a.bearing
            }))
            : []
    };

    const coveredClients = {
        type: 'FeatureCollection',
        features: result.coveredClients.map((client) => pointFeature(client, {
            client_id: client.id,
            assigned_pole_id: client.assigned_pole_id,
            assigned_sector_id: client.assigned_sector_id,
            distance: client.distance,
            bearing: client.bearing,
            coverage_status: client.coverage_status
        }))
    };

    const uncoveredClients = {
        type: 'FeatureCollection',
        features: result.uncoveredClients.map((client) => pointFeature(client, {
            client_id: client.id,
            coverage_status: client.coverage_status,
            reason: client.reason
        }))
    };

    return {
        recommendedPoles,
        sectorCoverage,
        coverageHeatmap,
        clientAssignments,
        coveredClients,
        uncoveredClients
    };
}

export function buildPreviewGeojson(result, options = {}) {
    const units = options.units || 'miles';
    const includeAssignments = options.createAssignmentLines === true;
    const allPoles = options.allPoles || [];
    const features = [];
    const selectedPoleIds = new Set(result.selectedPoles.map((entry) => entry.pole.id));

    result.selectedPoles.forEach((entry) => {
        entry.sectors.forEach((sector) => {
            createAntennaCoverageFeatures(entry.pole, sector, units, { preview: true })
                .forEach((feature) => features.push(feature));
        });

        features.push(pointFeature(entry.pole, {
            _preview: 'pole'
        }));
    });

    allPoles.forEach((pole) => {
        if (!selectedPoleIds.has(pole.id)) {
            features.push(pointFeature(pole, {
                _preview: 'unused_pole'
            }));
        }
    });

    result.coveredClients.forEach((client) => {
        features.push(pointFeature(client, {
            _preview: 'covered'
        }));
    });

    result.uncoveredClients.forEach((client) => {
        features.push(pointFeature(client, {
            _preview: 'uncovered'
        }));
    });

    if (includeAssignments) {
        result.assignments.forEach((a) => {
            const pole = result.selectedPoles.find((p) => p.pole.id === a.poleId)?.pole;
            if (pole) {
                features.push(lineFeature(a.client, pole, {
                    _preview: 'assignment'
                }));
            }
        });
    }

    return { type: 'FeatureCollection', features };
}

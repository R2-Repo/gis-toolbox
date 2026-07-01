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

export function createDefaultPoleSectorAttributes(defaultRange = 1, defaultWidth = 90, units = 'miles') {
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
            coverage_status: props.coverage_status || 'unknown',
            assigned_pole_id: props.assigned_pole_id ?? null,
            assigned_sector_id: props.assigned_sector_id ?? null,
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
        defaults.defaultWidth ?? 90,
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
            antenna_1_sector_width: parseFloat(props.antenna_1_sector_width ?? sectorDefaults.antenna_1_sector_width ?? defaults.defaultWidth ?? 90) || 90,
            antenna_1_range: parseFloat(props.antenna_1_range ?? sectorDefaults.antenna_1_range ?? defaults.defaultRange ?? 1) || 1,
            antenna_1_label: props.antenna_1_label ?? sectorDefaults.antenna_1_label ?? 'Sector A',
            antenna_2_enabled: props.antenna_2_enabled ?? sectorDefaults.antenna_2_enabled ?? false,
            antenna_2_azimuth: parseFloat(props.antenna_2_azimuth ?? sectorDefaults.antenna_2_azimuth ?? 180) || 180,
            antenna_2_sector_width: parseFloat(props.antenna_2_sector_width ?? sectorDefaults.antenna_2_sector_width ?? defaults.defaultWidth ?? 90) || 90,
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
    const fixedWidth = parseFloat(settings.defaultSectorWidth) || 90;

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

    let bestOverall = null;
    for (const width of SECTOR_WIDTH_OPTIONS) {
        const candidate = findBestDirectionForWidth(pole, inRange, width, range, units);
        if (!candidate || candidate.count === 0) continue;
        if (!bestOverall || candidate.count > bestOverall.count
            || (candidate.count === bestOverall.count && width < bestOverall.sectorWidth)) {
            bestOverall = {
                azimuth: candidate.azimuth,
                sectorWidth: width,
                range,
                coveredClients: candidate.covered,
                sectorId: `${pole.id}-sector-1`
            };
        }
    }

    return bestOverall;
}

export function findBestTwoSectorsForPole(pole, uncoveredClients, settings = {}) {
    const maxAntennas = settings.maxAntennasPerPole ?? 1;
    const first = findBestSectorForPole(pole, uncoveredClients, settings);
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

    while (uncovered.size > 0) {
        let bestCandidate = null;
        let bestScore = -Infinity;

        for (const pole of poles) {
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
                const polygon = createSectorPolygon(
                    entry.pole,
                    sector.azimuth,
                    sector.sectorWidth,
                    sector.range,
                    units
                );
                polygon.properties = {
                    pole_id: entry.pole.id,
                    sector_id: sector.sectorId,
                    antenna_number: sector.antennaNumber ?? 1,
                    azimuth: sector.azimuth,
                    sector_width: sector.sectorWidth,
                    range: sector.range,
                    covered_client_count: sector.coveredClients.length
                };
                return polygon;
            })
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
        clientAssignments,
        coveredClients,
        uncoveredClients
    };
}

export function buildPreviewGeojson(result, options = {}) {
    const units = options.units || 'miles';
    const includeAssignments = options.createAssignmentLines === true;
    const features = [];

    result.selectedPoles.forEach((entry) => {
        entry.sectors.forEach((sector) => {
            const polygon = createSectorPolygon(
                entry.pole,
                sector.azimuth,
                sector.sectorWidth,
                sector.range,
                units
            );
            polygon.properties = {
                _preview: 'sector',
                strokeColor: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2
            };
            features.push(polygon);
        });

        features.push(pointFeature(entry.pole, {
            _preview: 'pole',
            strokeColor: '#f97316',
            fillColor: '#f97316'
        }));
    });

    result.coveredClients.forEach((client) => {
        features.push(pointFeature(client, {
            _preview: 'covered',
            strokeColor: '#22c55e',
            fillColor: '#22c55e'
        }));
    });

    result.uncoveredClients.forEach((client) => {
        features.push(pointFeature(client, {
            _preview: 'uncovered',
            strokeColor: '#ef4444',
            fillColor: '#ef4444'
        }));
    });

    if (includeAssignments) {
        result.assignments.forEach((a) => {
            const pole = result.selectedPoles.find((p) => p.pole.id === a.poleId)?.pole;
            if (pole) {
                features.push(lineFeature(a.client, pole, {
                    _preview: 'assignment',
                    strokeColor: '#94a3b8'
                }));
            }
        });
    }

    return { type: 'FeatureCollection', features };
}

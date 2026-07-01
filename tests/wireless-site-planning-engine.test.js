import { describe, expect, it } from 'vitest';
import {
    buildPreviewGeojson,
    buildWirelessLocationsCsvTemplate,
    buildWirelessPlanningOutputLayers,
    calculateBearing,
    calculateDistance,
    createDefaultPoleSectorAttributes,
    createSectorPolygon,
    findBestSectorForPole,
    findBestTwoSectorsForPole,
    fitSectorWidthForClients,
    isPointInsideSector,
    normalizeClientPoints,
    normalizePolePoints,
    runGreedyPoleSectorOptimization,
    splitFeaturesByLocationType,
    validateWirelessPlanningInputs,
    WIRELESS_LOCATIONS_CSV_COLUMNS,
    WIRELESS_LOCATIONS_CSV_SAMPLE_ROWS
} from '../js/widgets/wireless-site-planning/engine.js';

function pointFeature(lon, lat, props = {}) {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: props
    };
}

const POLE_CENTER = { id: 'pole-1', name: 'Main Pole', lat: 40.0, lon: -111.0 };
const CLIENT_EAST = { id: 'c-east', name: 'East Client', lat: 40.0, lon: -110.99 };
const CLIENT_NORTH = { id: 'c-north', name: 'North Client', lat: 40.01, lon: -111.0 };
const CLIENT_WEST = { id: 'c-west', name: 'West Client', lat: 40.0, lon: -111.02 };

describe('wireless-site-planning validation', () => {
    it('validates missing client layer', () => {
        const result = validateWirelessPlanningInputs({
            clients: [],
            poles: [pointFeature(-111, 40)],
            settings: { defaultRange: 1, defaultSectorWidth: 90, units: 'miles' }
        });
        expect(result.errors.some((e) => e.includes('client'))).toBe(true);
    });

    it('validates missing pole layer', () => {
        const result = validateWirelessPlanningInputs({
            clients: [pointFeature(-111, 40)],
            poles: [],
            settings: { defaultRange: 1, defaultSectorWidth: 90, units: 'miles' }
        });
        expect(result.errors.some((e) => e.includes('pole'))).toBe(true);
    });

    it('normalizes client and pole points', () => {
        const clients = normalizeClientPoints([
            pointFeature(-111, 40, { id: 'c1', name: 'Client 1' }),
            { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} }
        ]);
        expect(clients.valid).toHaveLength(1);
        expect(clients.invalid).toHaveLength(1);

        const poles = normalizePolePoints([pointFeature(-111, 40, { id: 'p1' })], {
            defaultRange: 1,
            defaultWidth: 90,
            units: 'miles'
        });
        expect(poles.valid).toHaveLength(1);
        expect(poles.usingDefaults).toBe(1);
    });
});

describe('wireless-site-planning geometry', () => {
    it('calculates distance correctly', () => {
        const dist = calculateDistance(POLE_CENTER, CLIENT_EAST, 'miles');
        expect(dist).toBeGreaterThan(0.4);
        expect(dist).toBeLessThan(0.6);
    });

    it('calculates bearing correctly', () => {
        const eastBearing = calculateBearing(POLE_CENTER, CLIENT_EAST);
        const northBearing = calculateBearing(POLE_CENTER, CLIENT_NORTH);
        expect(eastBearing).toBeGreaterThan(80);
        expect(eastBearing).toBeLessThan(100);
        expect(northBearing).toBeGreaterThanOrEqual(0);
        expect(northBearing).toBeLessThan(20);
    });

    it('creates sector polygon', () => {
        const polygon = createSectorPolygon(POLE_CENTER, 90, 90, 1, 'miles', 16);
        expect(polygon.geometry.type).toBe('Polygon');
        expect(polygon.geometry.coordinates[0].length).toBeGreaterThan(3);
    });

    it('detects whether a client point is inside a sector', () => {
        const sector = { azimuth: 90, sectorWidth: 90, range: 1 };
        expect(isPointInsideSector(CLIENT_EAST, POLE_CENTER, sector, 'miles')).toBe(true);
        expect(isPointInsideSector(CLIENT_WEST, POLE_CENTER, sector, 'miles')).toBe(false);

        const farClient = { id: 'far', lat: 41, lon: -111 };
        expect(isPointInsideSector(farClient, POLE_CENTER, sector, 'miles')).toBe(false);
    });
});

describe('wireless-site-planning sector optimization', () => {
    const settings = {
        defaultRange: 2,
        defaultSectorWidth: 90,
        sectorWidthMode: 'fixed',
        units: 'miles'
    };

    it('finds best sector for a pole', () => {
        const clients = [CLIENT_EAST, CLIENT_NORTH, CLIENT_WEST];
        const result = findBestSectorForPole(POLE_CENTER, clients, settings);
        expect(result).not.toBeNull();
        expect(result.coveredClients.length).toBeGreaterThanOrEqual(1);
        expect(result.coveredClients.some((c) => c.id === 'c-east' || c.id === 'c-north')).toBe(true);
    });

    it('finds two sectors for a pole when max antennas is 2', () => {
        const clients = [CLIENT_EAST, CLIENT_WEST];
        const result = findBestTwoSectorsForPole(POLE_CENTER, clients, {
            ...settings,
            maxAntennasPerPole: 2
        });
        expect(result).not.toBeNull();
        expect(result.antennaCount).toBe(2);
        expect(result.coveredClients.length).toBe(2);
    });

    it('auto-fit picks independent sector widths per antenna', () => {
        const pole = { id: 'p1', lat: 40.0, lon: -111.0 };
        const eastClients = [
            { id: 'e1', lat: 40.0, lon: -110.995 },
            { id: 'e2', lat: 40.002, lon: -110.994 },
            { id: 'e3', lat: 39.998, lon: -110.993 }
        ];
        const westClients = [
            { id: 'w1', lat: 40.0, lon: -111.005 },
            { id: 'w2', lat: 40.0, lon: -111.006 }
        ];
        const clients = [...eastClients, ...westClients];

        const result = findBestTwoSectorsForPole(pole, clients, {
            defaultRange: 2,
            defaultSectorWidth: 90,
            sectorWidthMode: 'auto_fit',
            units: 'miles',
            maxAntennasPerPole: 2
        });

        expect(result).not.toBeNull();
        expect(result.sectors).toHaveLength(2);
        expect(result.sectors[0].sectorWidth).toBeLessThan(360);
        expect(result.sectors[1].sectorWidth).toBeLessThan(360);
        expect(result.sectors[0].sectorWidth).not.toBe(result.sectors[1].sectorWidth);
        expect(result.coveredClients.length).toBe(5);
    });

    it('auto-fit uses angular spread for sector width', () => {
        const pole = { id: 'p1', lat: 40.0, lon: -111.0 };
        const clients = [
            { id: 'c1', lat: 40.0, lon: -110.995 },
            { id: 'c2', lat: 40.0, lon: -110.994 }
        ];

        const width = fitSectorWidthForClients(pole, clients, 90);
        expect(width).toBeLessThanOrEqual(90);
        expect(width).toBeGreaterThanOrEqual(30);
    });

    it('greedy optimizer recommends a pole that covers the most clients', () => {
        const pole1 = { id: 'p1', name: 'Pole 1', lat: 40.0, lon: -111.0 };
        const pole2 = { id: 'p2', name: 'Pole 2', lat: 40.05, lon: -111.05 };
        const clients = [
            { id: 'c1', lat: 40.0, lon: -110.99 },
            { id: 'c2', lat: 40.01, lon: -111.0 },
            { id: 'c3', lat: 40.0, lon: -110.98 },
            { id: 'c4', lat: 40.05, lon: -111.04 }
        ];

        const result = runGreedyPoleSectorOptimization(clients, [pole1, pole2], {
            ...settings,
            optimizationGoal: 'cover_most',
            maxAntennasPerPole: 1
        });

        expect(result.selectedPoles.length).toBeGreaterThan(0);
        expect(result.summary.coveredClients).toBeGreaterThan(0);
        expect(result.selectedPoles[0].pole.id).toBe('p1');
    });

    it('returns uncovered clients correctly', () => {
        const pole = { id: 'p1', lat: 40.0, lon: -111.0 };
        const clients = [
            { id: 'near', lat: 40.0, lon: -110.99 },
            { id: 'far', lat: 42.0, lon: -111.0 }
        ];

        const result = runGreedyPoleSectorOptimization(clients, [pole], {
            defaultRange: 1,
            defaultSectorWidth: 90,
            sectorWidthMode: 'fixed',
            units: 'miles',
            maxAntennasPerPole: 1,
            optimizationGoal: 'cover_most'
        });

        expect(result.uncoveredClients.length).toBe(1);
        expect(result.uncoveredClients[0].id).toBe('far');
        expect(result.uncoveredClients[0].reason).toBe('out_of_range');
    });

    it('does not select the same pole more than once', () => {
        const pole = { id: 'p1', lat: 40.0, lon: -111.0 };
        const clients = [
            { id: 'c1', lat: 40.0, lon: -110.99 },
            { id: 'c2', lat: 40.01, lon: -111.0 },
            { id: 'c3', lat: 40.0, lon: -110.98 },
            { id: 'c4', lat: 40.005, lon: -111.01 }
        ];

        const result = runGreedyPoleSectorOptimization(clients, [pole], {
            defaultRange: 2,
            defaultSectorWidth: 90,
            sectorWidthMode: 'fixed',
            units: 'miles',
            maxAntennasPerPole: 2,
            optimizationGoal: 'cover_most'
        });

        const poleIds = result.selectedPoles.map((entry) => entry.pole.id);
        expect(new Set(poleIds).size).toBe(poleIds.length);
        expect(result.selectedPoles.length).toBe(1);
        expect(result.selectedPoles[0].antennaCount).toBeLessThanOrEqual(2);
        expect(result.summary.recommendedAntennas).toBeLessThanOrEqual(2);
    });
});

describe('wireless-site-planning output layers', () => {
    it('builds output layer features correctly', () => {
        const pole = { id: 'p1', name: 'Pole', lat: 40.0, lon: -111.0 };
        const result = runGreedyPoleSectorOptimization(
            [{ id: 'c1', lat: 40.0, lon: -110.99 }],
            [pole],
            {
                defaultRange: 2,
                defaultSectorWidth: 90,
                sectorWidthMode: 'fixed',
                units: 'miles',
                maxAntennasPerPole: 1,
                optimizationGoal: 'balanced'
            }
        );

        const layers = buildWirelessPlanningOutputLayers(result, { units: 'miles', createAssignmentLines: true });

        expect(layers.recommendedPoles.features.length).toBeGreaterThan(0);
        expect(layers.recommendedPoles.features[0].properties).toHaveProperty('pole_id');
        expect(layers.recommendedPoles.features[0].properties).toHaveProperty('score');

        expect(layers.sectorCoverage.features.length).toBeGreaterThan(0);
        expect(layers.sectorCoverage.features[0].properties).toHaveProperty('azimuth');
        expect(layers.sectorCoverage.features[0].properties).toHaveProperty('sector_width');

        expect(layers.coveredClients.features.length).toBe(1);
        expect(layers.coveredClients.features[0].properties).toHaveProperty('assigned_pole_id');

        expect(layers.clientAssignments.features.length).toBeGreaterThan(0);
        expect(layers.clientAssignments.features[0].properties).toHaveProperty('client_id');
    });

    it('creates default pole sector attributes', () => {
        const defaults = createDefaultPoleSectorAttributes(1, 90, 'miles');
        expect(defaults.antenna_count).toBe(1);
        expect(defaults.antenna_1_enabled).toBe(true);
        expect(defaults.antenna_1_label).toBe('Sector A');
        expect(defaults.antenna_2_enabled).toBe(false);
    });

    it('marks unused poles in preview geojson', () => {
        const poleUsed = { id: 'p1', lat: 40.0, lon: -111.0 };
        const poleUnused = { id: 'p2', lat: 40.05, lon: -111.05 };
        const result = runGreedyPoleSectorOptimization(
            [{ id: 'c1', lat: 40.0, lon: -110.99 }],
            [poleUsed, poleUnused],
            {
                defaultRange: 2,
                defaultSectorWidth: 90,
                sectorWidthMode: 'fixed',
                units: 'miles',
                maxAntennasPerPole: 1,
                optimizationGoal: 'balanced'
            }
        );

        const preview = buildPreviewGeojson(result, { allPoles: [poleUsed, poleUnused] });
        const previews = preview.features.map((f) => f.properties._preview);
        expect(previews).toContain('pole');
        expect(previews).toContain('unused_pole');
        expect(previews.filter((p) => p === 'unused_pole')).toHaveLength(1);
    });
});

describe('wireless-site-planning locations CSV template', () => {
    it('includes required import columns', () => {
        expect(WIRELESS_LOCATIONS_CSV_COLUMNS).toEqual([
            'location_type',
            'name',
            'latitude',
            'longitude'
        ]);
    });

    it('builds a CSV template with mixed client and pole sample rows', () => {
        const csv = buildWirelessLocationsCsvTemplate();
        expect(csv).toContain('location_type,name,latitude,longitude');
        expect(csv).toContain('client,I-15 @ 600 South');
        expect(csv).toContain('pole,Pole A - 600 South');
        expect(csv).toContain('40.7521');
        expect(csv).toContain('-111.8982');
        expect(csv.split('\n').filter(Boolean).length).toBe(WIRELESS_LOCATIONS_CSV_SAMPLE_ROWS.length + 1);
    });
});

describe('wireless-site-planning location_type split', () => {
    it('splits features by location_type', () => {
        const features = [
            pointFeature(-111.8982, 40.7521, { location_type: 'client', name: 'Client A' }),
            pointFeature(-111.8970, 40.7535, { location_type: 'pole', name: 'Pole A' }),
            pointFeature(-111.89, 40.76, { location_type: 'CLIENT', name: 'Client B' }),
            pointFeature(-111.88, 40.77, { location_type: 'POLE', name: 'Pole B' })
        ];

        const split = splitFeaturesByLocationType(features);
        expect(split.clients).toHaveLength(2);
        expect(split.poles).toHaveLength(2);
        expect(split.invalid).toHaveLength(0);
    });

    it('accepts type and point_type aliases', () => {
        const split = splitFeaturesByLocationType([
            pointFeature(-111, 40, { type: 'client' }),
            pointFeature(-111.1, 40.1, { point_type: 'pole' })
        ]);
        expect(split.clients).toHaveLength(1);
        expect(split.poles).toHaveLength(1);
    });

    it('skips rows with missing or unknown location_type', () => {
        const split = splitFeaturesByLocationType([
            pointFeature(-111, 40, { location_type: 'client' }),
            pointFeature(-111.1, 40.1, {}),
            pointFeature(-111.2, 40.2, { location_type: 'tower' })
        ]);
        expect(split.clients).toHaveLength(1);
        expect(split.poles).toHaveLength(0);
        expect(split.invalid).toHaveLength(2);
        expect(split.unknownTypeCount).toBe(1);
    });

    it('defaults client coverage fields during normalization', () => {
        const clients = normalizeClientPoints([
            pointFeature(-111, 40, { name: 'Client 1' })
        ]);
        expect(clients.valid[0].coverage_status).toBe('unknown');
        expect(clients.valid[0].assigned_pole_id).toBeNull();
    });
});

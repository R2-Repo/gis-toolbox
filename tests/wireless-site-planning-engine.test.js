import { describe, expect, it } from 'vitest';
import {
    buildWirelessPlanningOutputLayers,
    calculateBearing,
    calculateDistance,
    createDefaultPoleSectorAttributes,
    createSectorPolygon,
    findBestSectorForPole,
    findBestTwoSectorsForPole,
    isPointInsideSector,
    normalizeClientPoints,
    normalizePolePoints,
    runGreedyPoleSectorOptimization,
    validateWirelessPlanningInputs
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
});

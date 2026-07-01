import * as turf from '@turf/turf';
import { describe, expect, it } from 'vitest';
import {
    SCENARIOS,
    WORKFLOWS,
    DIRECTIONS,
    DEFAULT_SLACK_SETTINGS,
    convertDistance,
    convertToAllUnits,
    computeEstimatedSlack,
    computeScenarioOffsets,
    computeTotalSlackAdjustment,
    otdrToMapDistance,
    mapToOtdrDistance,
    runCalculatorWorkflow,
    validateWorkflowInput,
    applyDirection,
    tryMergeConnectedLines,
    buildRouteFromSelection,
    computePlotOnMapResult,
    computeClickOnMapResult,
    buildOutputFeatureCollection,
    distanceToFeet,
    feetToUnit
} from '../js/widgets/fiber-slack-otdr-helper/engine.js';

globalThis.turf = turf;

describe('fiber-slack-otdr-helper unit conversion', () => {
    it('converts feet to meters', () => {
        expect(convertDistance(100, 'feet', 'meters')).toBeCloseTo(30.48, 2);
    });

    it('converts feet to miles', () => {
        expect(convertDistance(5280, 'feet', 'miles')).toBeCloseTo(1, 5);
    });

    it('converts feet to kilometers', () => {
        expect(convertDistance(3280.839895, 'feet', 'kilometers')).toBeCloseTo(1, 5);
    });

    it('converts meters back to feet', () => {
        expect(convertDistance(1, 'meters', 'feet')).toBeCloseTo(3.280839895, 5);
    });

    it('converts miles back to feet', () => {
        expect(convertDistance(1, 'miles', 'feet')).toBeCloseTo(5280, 5);
    });

    it('converts kilometers back to feet', () => {
        expect(convertDistance(1, 'kilometers', 'feet')).toBeCloseTo(3280.839895, 5);
    });

    it('returns all supported units from feet', () => {
        const all = convertToAllUnits(1000);
        expect(all.feet).toBe(1000);
        expect(all.meters).toBeCloseTo(feetToUnit(1000, 'meters'), 5);
        expect(all.miles).toBeCloseTo(feetToUnit(1000, 'miles'), 5);
        expect(all.kilometers).toBeCloseTo(feetToUnit(1000, 'kilometers'), 5);
    });
});

describe('fiber-slack-otdr-helper slack calculation', () => {
    it('uses manual slack location count when provided', () => {
        const result = computeEstimatedSlack(10000, {
            ...DEFAULT_SLACK_SETTINGS,
            manualSlackLocations: 4,
            slackPerLocationFt: 50
        });
        expect(result.locationCount).toBe(4);
        expect(result.estimatedSlackFt).toBe(200);
    });

    it('estimates slack locations from spacing', () => {
        const result = computeEstimatedSlack(1200, {
            ...DEFAULT_SLACK_SETTINGS,
            spacingFt: 500,
            slackPerLocationFt: 50
        });
        expect(result.locationCount).toBe(2);
        expect(result.estimatedSlackFt).toBe(100);
    });

    it('computes OTDR to map distance', () => {
        const settings = { ...DEFAULT_SLACK_SETTINGS, manualSlackLocations: 2, slackPerLocationFt: 50 };
        const result = otdrToMapDistance(1000, settings, SCENARIOS.CUSTOM);
        expect(result.totalAdjustmentFt).toBe(100);
        expect(result.mapDistanceFt).toBe(900);
    });

    it('computes map to OTDR distance', () => {
        const settings = { ...DEFAULT_SLACK_SETTINGS, manualSlackLocations: 2, slackPerLocationFt: 50 };
        const result = mapToOtdrDistance(900, settings, SCENARIOS.CUSTOM);
        expect(result.totalAdjustmentFt).toBe(100);
        expect(result.otdrDistanceFt).toBe(1000);
    });

    it('adds scenario offsets for launch cable only', () => {
        const settings = {
            ...DEFAULT_SLACK_SETTINGS,
            launchCableFt: 100,
            receiveCableFt: 50,
            manualSlackLocations: 0
        };
        expect(computeScenarioOffsets(SCENARIOS.LAUNCH_ONLY, settings)).toBe(150);
        const slack = computeTotalSlackAdjustment(1000, settings, SCENARIOS.LAUNCH_ONLY);
        expect(slack.totalAdjustmentFt).toBe(150);
    });
});

describe('fiber-slack-otdr-helper validation', () => {
    it('warns when slack exceeds OTDR distance', () => {
        const validation = validateWorkflowInput({
            workflow: WORKFLOWS.PLOT_OTDR,
            inputDistance: 100,
            inputUnit: 'feet',
            slackSettings: { ...DEFAULT_SLACK_SETTINGS, manualSlackLocations: 5, slackPerLocationFt: 50 },
            scenario: SCENARIOS.CUSTOM,
            routeLengthFt: 5000,
            otdrDistanceFt: 100,
            mapDistanceFt: -150
        });
        expect(validation.warnings.some((w) => w.includes('greater than the entered OTDR distance'))).toBe(true);
    });

    it('warns when calculated distance exceeds route length', () => {
        const validation = validateWorkflowInput({
            workflow: WORKFLOWS.PLOT_OTDR,
            inputDistance: 5000,
            inputUnit: 'feet',
            slackSettings: DEFAULT_SLACK_SETTINGS,
            scenario: SCENARIOS.CUSTOM,
            routeLengthFt: 1000,
            otdrDistanceFt: 5000,
            mapDistanceFt: 5000
        });
        expect(validation.warnings.some((w) => w.includes('longer than the selected route'))).toBe(true);
    });
});

describe('fiber-slack-otdr-helper calculator workflow', () => {
    it('converts map distance to OTDR distance', () => {
        const result = runCalculatorWorkflow({
            inputDistance: 900,
            inputUnit: 'feet',
            inputType: 'map',
            slackSettings: { ...DEFAULT_SLACK_SETTINGS, manualSlackLocations: 2, slackPerLocationFt: 50 },
            scenario: SCENARIOS.CUSTOM
        });
        expect(result.ok).toBe(true);
        expect(result.result.otdrDistanceFt).toBe(1000);
        expect(result.result.mapDistanceFt).toBe(900);
    });

    it('converts OTDR distance to map distance', () => {
        const result = runCalculatorWorkflow({
            inputDistance: 1000,
            inputUnit: 'feet',
            inputType: 'otdr',
            slackSettings: { ...DEFAULT_SLACK_SETTINGS, manualSlackLocations: 2, slackPerLocationFt: 50 },
            scenario: SCENARIOS.CUSTOM
        });
        expect(result.ok).toBe(true);
        expect(result.result.mapDistanceFt).toBe(900);
        expect(result.result.otdrDistanceFt).toBe(1000);
    });
});

describe('fiber-slack-otdr-helper direction and merge', () => {
    const lineA = turf.lineString([[-111.9, 40.7], [-111.899, 40.7]]);
    const lineB = turf.lineString([[-111.899, 40.7], [-111.898, 40.7]]);

    it('reverses line for from_end direction', () => {
        const reversed = applyDirection(lineA, DIRECTIONS.FROM_END);
        const orig = lineA.geometry.coordinates;
        const rev = reversed.geometry.coordinates;
        expect(rev[0]).toEqual(orig[orig.length - 1]);
        expect(rev[rev.length - 1]).toEqual(orig[0]);
    });

    it('merges connected line segments', () => {
        const merge = tryMergeConnectedLines([lineA, lineB]);
        expect(merge.ok).toBe(true);
        expect(merge.routeLine.geometry.coordinates.length).toBe(3);
    });

    it('warns when segments do not connect', () => {
        const lineC = turf.lineString([[-111.5, 40.5], [-111.499, 40.5]]);
        const merge = tryMergeConnectedLines([lineA, lineC]);
        expect(merge.ok).toBe(true);
        expect(merge.warnings.length).toBeGreaterThan(0);
    });

    it('measures from opposite end with direction change', () => {
        const route = buildRouteFromSelection([lineA, lineB], DIRECTIONS.FROM_START);
        const reversed = buildRouteFromSelection([lineA, lineB], DIRECTIONS.FROM_END);
        expect(route.ok).toBe(true);
        expect(reversed.ok).toBe(true);
        expect(route.routeLengthFt).toBeCloseTo(reversed.routeLengthFt, 3);
    });
});

describe('fiber-slack-otdr-helper map workflows', () => {
    const routeLine = turf.lineString([
        [-111.9, 40.7],
        [-111.899, 40.7],
        [-111.898, 40.7],
        [-111.897, 40.7]
    ]);
    const routeLengthFt = turf.length(routeLine, { units: 'feet' });

    it('plots OTDR distance on map', () => {
        const inputDistance = routeLengthFt * 0.5 + 50;
        const result = computePlotOnMapResult({
            routeLine,
            routeLengthFt,
            inputDistance,
            inputUnit: 'feet',
            slackSettings: { ...DEFAULT_SLACK_SETTINGS, manualSlackLocations: 1, slackPerLocationFt: 50 },
            scenario: SCENARIOS.CUSTOM,
            direction: DIRECTIONS.FROM_START
        });
        expect(result.ok).toBe(true);
        expect(result.result.plotPoint).toBeTruthy();
        expect(result.result.clippedLine).toBeTruthy();
        expect(result.result.mapDistanceFt).toBeCloseTo(inputDistance - 50, 1);
    });

    it('computes OTDR distance from map click', () => {
        const clickLocationFt = routeLengthFt * 0.25;
        const result = computeClickOnMapResult({
            routeLine,
            routeLengthFt,
            clickLocationFt,
            nearLineDistanceFt: 0,
            slackSettings: { ...DEFAULT_SLACK_SETTINGS, manualSlackLocations: 1, slackPerLocationFt: 50 },
            scenario: SCENARIOS.CUSTOM,
            direction: DIRECTIONS.FROM_START
        });
        expect(result.ok).toBe(true);
        expect(result.result.otdrDistanceFt).toBeCloseTo(clickLocationFt + 50, 1);
        expect(result.result.mapDistanceFt).toBeCloseTo(clickLocationFt, 1);
    });

    it('builds output feature collection', () => {
        const plot = computePlotOnMapResult({
            routeLine,
            routeLengthFt,
            inputDistance: routeLengthFt * 0.4 + 50,
            inputUnit: 'feet',
            slackSettings: DEFAULT_SLACK_SETTINGS,
            scenario: SCENARIOS.CUSTOM
        });
        const fc = buildOutputFeatureCollection(plot.result);
        expect(fc.features.length).toBeGreaterThanOrEqual(2);
        expect(fc.features.some((f) => f.properties.feature_role === 'result_point')).toBe(true);
        expect(fc.features.some((f) => f.properties.feature_role === 'measured_route')).toBe(true);
    });
});

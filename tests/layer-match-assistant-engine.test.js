import { describe, expect, it } from 'vitest';
import {
    MATCH_STATUS,
    baseNameScore,
    buildMatchReason,
    buildSpatialGridIndex,
    classifyMatch,
    computeFinalScore,
    computeNameScore,
    computeSpatialScore,
    detectAssetTypeConflict,
    detectLatLonSwap,
    exactNormalizedScore,
    extractBaseName,
    extractNumbers,
    findNearbyCandidates,
    haversineDistanceMeters,
    levenshteinScore,
    normalizeAbbreviations,
    normalizeText,
    numberMatchScore,
    parseCoordinate,
    runLayerMatch,
    scoreCandidate,
    tokenOverlapScore,
    tokenSortScore,
    validateLayerMatchInput
} from '../js/widgets/layer-match-assistant/engine.js';

describe('layer-match-assistant engine text', () => {
    it('normalizes punctuation and abbreviations', () => {
        expect(normalizeText("St. Mary's Fiber Hut #12")).toBe('saint marys fiber hut 12');
        expect(normalizeText('Central Office - Denver')).toBe('central office denver');
        expect(normalizeAbbreviations('st mary rd')).toBe('saint mary road');
    });

    it('scores token overlap for reordered names', () => {
        expect(tokenOverlapScore('Denver Central Office', 'Central Office Denver')).toBeGreaterThan(80);
        expect(tokenSortScore('Denver Central Office', 'Central Office Denver')).toBeGreaterThan(90);
    });

    it('handles minor typos with levenshtein', () => {
        expect(levenshteinScore('central office', 'centrall office')).toBeGreaterThan(80);
    });

    it('rewards shared asset numbers and penalizes conflicts', () => {
        expect(numberMatchScore('Cabinet 1042 North', 'Site 1042')).toBe(100);
        expect(numberMatchScore('Cabinet 1042', 'Cabinet 2042')).toBe(20);
        expect(extractNumbers('Cabinet 1042 North')).toEqual(['1042']);
    });

    it('detects conflicting asset types', () => {
        expect(detectAssetTypeConflict('Cabinet 1042', 'Pedestal 1042')).toBe(true);
        expect(computeNameScore('Cabinet 1042', 'Pedestal 1042', { strictness: 'balanced' }))
            .toBeLessThan(computeNameScore('Cabinet 1042', 'Cabinet 1042 North', { strictness: 'balanced' }));
    });

    it('handles empty names', () => {
        expect(computeNameScore('', '')).toBeNull();
        expect(computeNameScore('Cabinet 1', '')).toBe(0);
    });

    it('exact normalized score', () => {
        expect(exactNormalizedScore('Central Office', 'central office')).toBe(100);
        expect(exactNormalizedScore('Central Office', 'Denver Office')).toBe(0);
    });

    it('matches same base name with different ID suffixes', () => {
        const left = 'Scipio Shed(r02-25244)';
        const right = 'Scipio Shed 4484';
        expect(extractBaseName(left)).toBe('scipio shed');
        expect(extractBaseName(right)).toBe('scipio shed');
        expect(baseNameScore(left, right)).toBe(100);
        expect(computeNameScore(left, right, { strictness: 'balanced' })).toBeGreaterThanOrEqual(95);
    });
});

describe('layer-match-assistant engine spatial', () => {
    it('parses coordinates', () => {
        expect(parseCoordinate('40.123')).toBe(40.123);
        expect(parseCoordinate('invalid')).toBeNull();
    });

    it('detects lat/lon swap', () => {
        expect(detectLatLonSwap(112.5, 40.1)).toBe(true);
        expect(detectLatLonSwap(40.1, -112.5)).toBe(false);
    });

    it('computes haversine distance', () => {
        const meters = haversineDistanceMeters(40, -112, 40.0001, -112.0001);
        expect(meters).toBeGreaterThan(0);
        expect(meters).toBeLessThan(20);
    });

    it('scores spatial distance within tolerance', () => {
        expect(computeSpatialScore(0, 50)).toBe(100);
        expect(computeSpatialScore(8, 50)).toBe(95);
        expect(computeSpatialScore(100, 50)).toBe(0);
    });
});

describe('layer-match-assistant engine scoring', () => {
    it('computes weighted final score', () => {
        const score = computeFinalScore(
            { spatialScore: 100, nameScore: 80, optionalFieldScore: 100 },
            { spatial: 0.7, name: 0.25, optional: 0.05 }
        );
        expect(score).toBeGreaterThan(90);
    });

    it('classifies match thresholds', () => {
        expect(classifyMatch(95, {}, { strictness: 'balanced' })).toBe(MATCH_STATUS.CONFIRMED);
        expect(classifyMatch(78, {}, { strictness: 'balanced' })).toBe(MATCH_STATUS.LIKELY);
        expect(classifyMatch(60, {}, { strictness: 'balanced' })).toBe(MATCH_STATUS.POSSIBLE);
        expect(classifyMatch(40, {}, { strictness: 'balanced' })).toBe(MATCH_STATUS.NO_MATCH);
        expect(classifyMatch(90, { isConflict: true }, { strictness: 'balanced' })).toBe(MATCH_STATUS.CONFLICT);
    });

    it('builds explainable match reasons', () => {
        const reason = buildMatchReason({
            matchStatus: MATCH_STATUS.LIKELY,
            distanceFeet: 23,
            spatialScore: 88,
            nameScore: 82,
            optionalFieldScore: null,
            aName: 'Cab A',
            bName: 'Cab A North'
        });
        expect(reason.toLowerCase()).toContain('likely match');
        expect(reason).toContain('23 ft');
    });
});

describe('layer-match-assistant runLayerMatch', () => {
    const layerB = [
        { uid: 'b:0', lat: 40.0001, lon: -112.0001, name: 'Cabinet 1042', featureIndex: 0, fields: {} },
        { uid: 'b:1', lat: 40.00015, lon: -112.00015, name: 'Pedestal 1042', featureIndex: 1, fields: {} }
    ];

    it('matches nearby records with similar names', async () => {
        const layerA = [
            { uid: 'a:0', lat: 40, lon: -112, name: 'Cabinet 1042 North', featureIndex: 0, fields: {} }
        ];
        const result = await runLayerMatch({
            layerA,
            layerB,
            options: { toleranceFeet: 500, strictness: 'balanced', nameFieldsSelected: true }
        });
        expect(result.matches.length).toBe(1);
        expect(result.matches[0].source_b_uid).toBe('b:0');
        expect(result.matches[0].final_score).toBeGreaterThan(55);
    });

    it('flags conflicts when candidates are close in score', async () => {
        const layerA = [
            { uid: 'a:0', lat: 40.00012, lon: -112.00012, name: 'Asset 1042', featureIndex: 0, fields: {} }
        ];
        const result = await runLayerMatch({
            layerA,
            layerB,
            options: { toleranceFeet: 500, strictness: 'balanced', nameFieldsSelected: true }
        });
        expect(result.matches.length).toBe(1);
        expect([MATCH_STATUS.CONFLICT, MATCH_STATUS.LIKELY, MATCH_STATUS.POSSIBLE])
            .toContain(result.matches[0].match_status);
    });

    it('leaves records outside tolerance unmatched', async () => {
        const layerA = [
            { uid: 'a:0', lat: 41, lon: -113, name: 'Far Site', featureIndex: 0, fields: {} }
        ];
        const result = await runLayerMatch({
            layerA,
            layerB,
            options: { toleranceFeet: 10, strictness: 'balanced', nameFieldsSelected: true }
        });
        expect(result.matches.length).toBe(0);
        expect(result.unmatchedA.length).toBe(1);
    });

    it('detects multiple A records matching same B', async () => {
        const sharedB = [{ uid: 'b:0', lat: 40, lon: -112, name: 'Cabinet 1', featureIndex: 0, fields: {} }];
        const layerA = [
            { uid: 'a:0', lat: 40.00001, lon: -112.00001, name: 'Cabinet 1', featureIndex: 0, fields: {} },
            { uid: 'a:1', lat: 40.00002, lon: -112.00002, name: 'Cabinet 1 East', featureIndex: 1, fields: {} }
        ];
        const result = await runLayerMatch({
            layerA,
            layerB: sharedB,
            options: { toleranceFeet: 100, strictness: 'balanced', nameFieldsSelected: true }
        });
        expect(result.matches.length).toBe(2);
        expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('validates missing layers', () => {
        const validation = validateLayerMatchInput({ layerA: [], layerB: [] });
        expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('uses spatial grid index for candidates', () => {
        const records = [
            { uid: 'b:0', lat: 40, lon: -112 },
            { uid: 'b:1', lat: 40.001, lon: -112.001 }
        ];
        const index = buildSpatialGridIndex(records, { toleranceFeet: 500 });
        const candidates = findNearbyCandidates({ lat: 40.00005, lon: -112.00005 }, index, { toleranceFeet: 500 });
        expect(candidates.length).toBeGreaterThan(0);
    });

    it('scores candidate pairs', () => {
        const a = { uid: 'a:0', lat: 40, lon: -112, name: 'Cab 1', featureIndex: 0, fields: {} };
        const b = { uid: 'b:0', lat: 40.00001, lon: -112.00001, name: 'Cab 1', featureIndex: 0, fields: {} };
        const scored = scoreCandidate(a, b, { toleranceFeet: 100, nameFieldsSelected: true, strictness: 'balanced' });
        expect(scored.final_score).toBeGreaterThan(70);
    });

    it('matches real-world shed names with different IDs and ~64 ft apart', async () => {
        const layerA = [{
            uid: 'a:0',
            lat: 39.254875,
            lon: -112.103667,
            name: 'Scipio Shed(r02-25244)',
            featureIndex: 0,
            fields: {}
        }];
        const layerB = [{
            uid: 'b:0',
            lat: 39.25470238,
            lon: -112.1036181,
            name: 'Scipio Shed 4484',
            featureIndex: 0,
            fields: {}
        }];
        const result = await runLayerMatch({
            layerA,
            layerB,
            options: { toleranceFeet: 50, strictness: 'balanced', nameFieldsSelected: true }
        });
        expect(result.matches.length).toBe(1);
        expect(result.matches[0].final_score).toBeGreaterThanOrEqual(78);
        expect([MATCH_STATUS.CONFIRMED, MATCH_STATUS.LIKELY]).toContain(result.matches[0].match_status);
    });
});

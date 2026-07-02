import { describe, expect, it } from 'vitest';
import {
    buildCoverageRasters,
    buildCoverageSignalGrid,
    blurSignalGrid,
    COVERAGE_RASTER_DEFAULTS,
    signalStrengthAtOffset,
    signalToRgba
} from '../js/widgets/wireless-site-planning/coverage-raster.js';

const POLE_CENTER = { id: 'pole-1', name: 'Main Pole', lat: 40.0, lon: -111.0 };

describe('wireless coverage raster', () => {
    const sector = {
        sectorId: 'p1-sector-a',
        azimuth: 90,
        sectorWidth: 45,
        range: 1,
        antennaNumber: 1
    };

    it('maps stronger signal on boresight than off-boresight at same distance', () => {
        const rangeMeters = 1609.344 * 0.5;
        const onBoresight = signalStrengthAtOffset(POLE_CENTER, rangeMeters, 0, sector, 'miles');
        const offBoresight = signalStrengthAtOffset(POLE_CENTER, 0, rangeMeters, sector, 'miles');
        expect(onBoresight).toBeGreaterThan(0.4);
        expect(onBoresight).toBeGreaterThan(offBoresight);
    });

    it('maps side-lobe angles much weaker than boresight at same distance', () => {
        const rangeMeters = 1609.344 * 0.05;
        const boresight = signalStrengthAtOffset(POLE_CENTER, rangeMeters, 0, sector, 'miles');
        const sideLobeBearingRad = ((90 + 53) * Math.PI) / 180;
        const sideDx = rangeMeters * Math.sin(sideLobeBearingRad);
        const sideDy = rangeMeters * Math.cos(sideLobeBearingRad);
        const sideLobe = signalStrengthAtOffset(POLE_CENTER, sideDx, sideDy, sector, 'miles');
        expect(sideLobe).toBeGreaterThan(0.03);
        expect(sideLobe).toBeLessThan(boresight);

        const farSideDx = rangeMeters * 2.2 * Math.sin(sideLobeBearingRad);
        const farSideDy = rangeMeters * 2.2 * Math.cos(sideLobeBearingRad);
        expect(signalStrengthAtOffset(POLE_CENTER, farSideDx, farSideDy, sector, 'miles')).toBe(0);
    });

    it('extends side-lobe heatmap slightly beyond strict outline envelope', () => {
        const rangeMeters = 1609.344;
        const sideLobeBearingRad = ((90 + 53) * Math.PI) / 180;
        const strictFraction = 0.04;
        const spreadFraction = 0.075;
        const pastFraction = 0.11;
        const strictDx = rangeMeters * strictFraction * Math.sin(sideLobeBearingRad);
        const strictDy = rangeMeters * strictFraction * Math.cos(sideLobeBearingRad);
        const spreadDx = rangeMeters * spreadFraction * Math.sin(sideLobeBearingRad);
        const spreadDy = rangeMeters * spreadFraction * Math.cos(sideLobeBearingRad);
        const pastDx = rangeMeters * pastFraction * Math.sin(sideLobeBearingRad);
        const pastDy = rangeMeters * pastFraction * Math.cos(sideLobeBearingRad);
        const strictSignal = signalStrengthAtOffset(POLE_CENTER, strictDx, strictDy, sector, 'miles');
        const spreadSignal = signalStrengthAtOffset(POLE_CENTER, spreadDx, spreadDy, sector, 'miles');
        const pastSignal = signalStrengthAtOffset(POLE_CENTER, pastDx, pastDy, sector, 'miles');
        expect(strictSignal).toBeGreaterThan(spreadSignal);
        expect(spreadSignal).toBeGreaterThan(0);
        expect(pastSignal).toBe(0);
    });

    it('boosts side-lobe signal nearer the pole', () => {
        const rangeMeters = 1609.344 * 0.04;
        const sideLobeBearingRad = ((90 + 53) * Math.PI) / 180;
        const nearDx = rangeMeters * Math.sin(sideLobeBearingRad);
        const nearDy = rangeMeters * Math.cos(sideLobeBearingRad);
        const farDx = rangeMeters * 2.5 * Math.sin(sideLobeBearingRad);
        const farDy = rangeMeters * 2.5 * Math.cos(sideLobeBearingRad);
        expect(signalStrengthAtOffset(POLE_CENTER, nearDx, nearDy, sector, 'miles'))
            .toBeGreaterThan(signalStrengthAtOffset(POLE_CENTER, farDx, farDy, sector, 'miles'));
    });

    it('keeps warm-range signal farther along the main lobe boresight', () => {
        const rangeMeters = 1609.344;
        const midLobe = signalStrengthAtOffset(POLE_CENTER, rangeMeters * 0.55, 0, sector, 'miles');
        const farLobe = signalStrengthAtOffset(POLE_CENTER, rangeMeters * 0.85, 0, sector, 'miles');
        const tipLobe = signalStrengthAtOffset(POLE_CENTER, rangeMeters * 0.92, 0, sector, 'miles');
        expect(midLobe).toBeGreaterThan(0.45);
        expect(farLobe).toBeGreaterThan(0.28);
        expect(tipLobe).toBeGreaterThan(0.2);
    });

    it('ramps weak signal from light blue fringe to dark blue', () => {
        const fringe = signalToRgba(0.04);
        const strongBlue = signalToRgba(0.26);
        const fringeSum = fringe[0] + fringe[1] + fringe[2];
        const strongBlueSum = strongBlue[0] + strongBlue[1] + strongBlue[2];
        expect(fringeSum).toBeGreaterThan(strongBlueSum);
        expect(strongBlue[2]).toBeGreaterThan(strongBlue[0]);
    });

    it('returns transparent rgba below display threshold', () => {
        expect(signalToRgba(0.01)).toEqual([0, 0, 0, 0]);
        expect(signalToRgba(1)[3]).toBeGreaterThan(200);
    });

    it('builds a capped signal grid with geographic bbox', () => {
        const grid = buildCoverageSignalGrid(POLE_CENTER, sector, 'miles');
        expect(grid.width).toBeLessThanOrEqual(COVERAGE_RASTER_DEFAULTS.maxDimension);
        expect(grid.height).toBeLessThanOrEqual(COVERAGE_RASTER_DEFAULTS.maxDimension);
        expect(grid.width).toBeGreaterThan(200);
        expect(grid.signals.length).toBe(grid.width * grid.height);
        expect(grid.bbox).toHaveLength(4);
        expect(grid.coordinates).toHaveLength(4);
        let peakSignal = 0;
        for (let i = 0; i < grid.signals.length; i++) {
            if (grid.signals[i] > peakSignal) peakSignal = grid.signals[i];
        }
        expect(peakSignal).toBeGreaterThan(0.8);
    });

    it('smooths blocky signal transitions with blur', () => {
        const grid = buildCoverageSignalGrid(POLE_CENTER, sector, 'miles');
        const blurred = blurSignalGrid(grid.signals, grid.width, grid.height, 2);

        let rawMaxJump = 0;
        let blurredMaxJump = 0;
        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width - 1; col++) {
                const i = row * grid.width + col;
                rawMaxJump = Math.max(rawMaxJump, Math.abs(grid.signals[i] - grid.signals[i + 1]));
                blurredMaxJump = Math.max(blurredMaxJump, Math.abs(blurred[i] - blurred[i + 1]));
            }
        }
        expect(rawMaxJump).toBeGreaterThan(0);
        expect(blurredMaxJump).toBeLessThan(rawMaxJump);
    });

    it('builds one raster per selected pole', () => {
        const selectedPoles = [{
            pole: POLE_CENTER,
            sectors: [sector]
        }];
        const rasters = buildCoverageRasters(selectedPoles, 'miles');
        expect(rasters).toHaveLength(1);
        expect(rasters[0].poleId).toBe('pole-1');
        expect(rasters[0].width).toBeGreaterThan(0);
        expect(rasters[0].bbox).toHaveLength(4);
    });
});

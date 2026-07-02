import * as turf from '@turf/turf';
import { signalStrengthForCoverageDisplay } from './engine.js';

/** Signal strength 0–1 → RGBA; weak signal uses light-to-dark blue gradient. */
export const SIGNAL_COLOR_STOPS = [
    { stop: 0, rgba: [0, 0, 255, 0] },
    { stop: 0.02, rgba: [186, 230, 253, 255] },
    { stop: 0.06, rgba: [147, 197, 253, 255] },
    { stop: 0.10, rgba: [96, 165, 250, 255] },
    { stop: 0.16, rgba: [59, 130, 246, 255] },
    { stop: 0.22, rgba: [37, 99, 235, 255] },
    { stop: 0.28, rgba: [29, 78, 216, 255] },
    { stop: 0.34, rgba: [30, 58, 138, 255] },
    { stop: 0.42, rgba: [6, 182, 212, 255] },
    { stop: 0.52, rgba: [34, 197, 94, 255] },
    { stop: 0.64, rgba: [234, 179, 8, 255] },
    { stop: 0.78, rgba: [249, 115, 22, 255] },
    { stop: 1, rgba: [239, 68, 68, 255] }
];

export const COVERAGE_RASTER_DEFAULTS = {
    spanFactor: 2.1,
    minCellMeters: 6,
    maxDimension: 1024,
    minSignal: 0.02,
    maxOpacity: 0.82,
    /** Separable box-blur radius (px) on signal grid before color mapping — softens blocky lobes. */
    signalBlurRadius: 2
};

function normalizeAngle(angle) {
    let a = angle % 360;
    if (a < 0) a += 360;
    return a;
}

function angleDelta(from, to) {
    const diff = Math.abs(normalizeAngle(to) - normalizeAngle(from));
    return diff > 180 ? 360 - diff : diff;
}

function rangeToMeters(range, units) {
    return turf.convertLength(range, units, 'meters');
}

function distanceToUnits(meters, units) {
    return turf.convertLength(meters, 'meters', units);
}

/** Local east/north offset in meters → [lon, lat]. */
export function offsetMetersToLonLat(pole, dxMeters, dyMeters) {
    const dist = Math.hypot(dxMeters, dyMeters);
    if (dist < 1e-6) return [pole.lon, pole.lat];
    const bearing = (Math.atan2(dxMeters, dyMeters) * 180) / Math.PI;
    const normalized = bearing < 0 ? bearing + 360 : bearing;
    return turf.destination(
        turf.point([pole.lon, pole.lat]),
        dist,
        normalized,
        { units: 'meters' }
    ).geometry.coordinates;
}

/** Signal at a local meter offset from the pole (east +x, north +y). */
export function signalStrengthAtOffset(pole, dxMeters, dyMeters, sector, units) {
    const distanceMeters = Math.hypot(dxMeters, dyMeters);
    const distance = distanceToUnits(distanceMeters, units);
    const bearing = distanceMeters < 1e-6
        ? sector.azimuth
        : ((Math.atan2(dxMeters, dyMeters) * 180) / Math.PI + 360) % 360;
    const rel = angleDelta(bearing, sector.azimuth);
    return signalStrengthForCoverageDisplay(rel, distance, sector.range, sector.sectorWidth);
}

export function signalStrengthAtLocation(pole, lon, lat, sector, units) {
    const from = turf.point([pole.lon, pole.lat]);
    const to = turf.point([lon, lat]);
    const distance = turf.distance(from, to, { units });
    const bearing = turf.bearing(from, to);
    const rel = angleDelta(bearing, sector.azimuth);
    return signalStrengthForCoverageDisplay(rel, distance, sector.range, sector.sectorWidth);
}

function interpolateColorStops(signal) {
    const t = Math.max(0, Math.min(1, signal));
    for (let i = 0; i < SIGNAL_COLOR_STOPS.length - 1; i++) {
        const left = SIGNAL_COLOR_STOPS[i];
        const right = SIGNAL_COLOR_STOPS[i + 1];
        if (t <= right.stop) {
            const span = right.stop - left.stop || 1;
            const f = (t - left.stop) / span;
            return left.rgba.map((_, idx) =>
                Math.round(left.rgba[idx] + (right.rgba[idx] - left.rgba[idx]) * f)
            );
        }
    }
    return [...SIGNAL_COLOR_STOPS[SIGNAL_COLOR_STOPS.length - 1].rgba];
}

/** Map signal 0–1 to [r, g, b, a]. */
export function signalToRgba(signal, options = {}) {
    const {
        minSignal = COVERAGE_RASTER_DEFAULTS.minSignal,
        maxOpacity = COVERAGE_RASTER_DEFAULTS.maxOpacity
    } = options;

    if (signal < minSignal) return [0, 0, 0, 0];

    const [r, g, b] = interpolateColorStops(signal);
    const alpha = Math.round(255 * maxOpacity * Math.min(1, 0.35 + signal * 0.75));
    return [r, g, b, alpha];
}

function maxRangeMetersForSectors(sectors, units) {
    return Math.max(...sectors.map((sector) => rangeToMeters(sector.range, units)), 1);
}

/** Pure signal grid for tests and raster rendering. */
export function buildCoverageSignalGrid(pole, sectors, units, options = {}) {
    const {
        spanFactor = COVERAGE_RASTER_DEFAULTS.spanFactor,
        minCellMeters = COVERAGE_RASTER_DEFAULTS.minCellMeters,
        maxDimension = COVERAGE_RASTER_DEFAULTS.maxDimension
    } = options;

    const sectorList = Array.isArray(sectors) ? sectors : [sectors];
    const halfSpan = maxRangeMetersForSectors(sectorList, units) * (spanFactor / 2);
    const span = halfSpan * 2;
    const cellMeters = Math.max(minCellMeters, span / maxDimension);
    const width = Math.min(maxDimension, Math.max(8, Math.ceil(span / cellMeters)));
    const height = width;

    const signals = new Float32Array(width * height);
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const dx = -halfSpan + ((col + 0.5) / width) * span;
            const dy = halfSpan - ((row + 0.5) / height) * span;
            let maxSignal = 0;
            for (const sector of sectorList) {
                maxSignal = Math.max(maxSignal, signalStrengthAtOffset(pole, dx, dy, sector, units));
            }
            signals[row * width + col] = maxSignal;
        }
    }

    const coordinates = [
        offsetMetersToLonLat(pole, -halfSpan, halfSpan),
        offsetMetersToLonLat(pole, halfSpan, halfSpan),
        offsetMetersToLonLat(pole, halfSpan, -halfSpan),
        offsetMetersToLonLat(pole, -halfSpan, -halfSpan)
    ];
    const bbox = [
        Math.min(coordinates[0][0], coordinates[3][0]),
        Math.min(coordinates[2][1], coordinates[3][1]),
        Math.max(coordinates[1][0], coordinates[2][0]),
        Math.max(coordinates[0][1], coordinates[1][1])
    ];

    return {
        signals,
        width,
        height,
        halfSpan,
        cellMeters,
        coordinates,
        bbox
    };
}

/** Separable box blur on a signal grid — reduces visible pixel blocks in warm lobes. */
export function blurSignalGrid(signals, width, height, radius = 0) {
    if (!radius || radius <= 0) return signals;

    const temp = new Float32Array(signals.length);
    const out = new Float32Array(signals.length);

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            let sum = 0;
            let count = 0;
            for (let k = -radius; k <= radius; k++) {
                const c = Math.min(width - 1, Math.max(0, col + k));
                sum += signals[row * width + c];
                count++;
            }
            temp[row * width + col] = sum / count;
        }
    }

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            let sum = 0;
            let count = 0;
            for (let k = -radius; k <= radius; k++) {
                const r = Math.min(height - 1, Math.max(0, row + k));
                sum += temp[r * width + col];
                count++;
            }
            out[row * width + col] = sum / count;
        }
    }

    return out;
}

function renderSignalGridToDataUrl(grid, options = {}) {
    if (typeof document === 'undefined') return null;

    const blurRadius = options.signalBlurRadius ?? COVERAGE_RASTER_DEFAULTS.signalBlurRadius;
    const signals = blurSignalGrid(grid.signals, grid.width, grid.height, blurRadius);

    const canvas = document.createElement('canvas');
    canvas.width = grid.width;
    canvas.height = grid.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(grid.width, grid.height);
    const pixels = imageData.data;

    for (let i = 0; i < signals.length; i++) {
        const [r, g, b, a] = signalToRgba(signals[i], options);
        const offset = i * 4;
        pixels[offset] = r;
        pixels[offset + 1] = g;
        pixels[offset + 2] = b;
        pixels[offset + 3] = a;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
}

/**
 * Build a georeferenced PNG raster for one pole (all sectors composited with max signal).
 * @returns {{ dataUrl, coordinates, bbox, width, height, poleId }}
 */
export function createAntennaCoverageRaster(pole, sectors, units, options = {}) {
    const sectorList = Array.isArray(sectors) ? sectors : [sectors];
    const grid = buildCoverageSignalGrid(pole, sectorList, units, options);

    return {
        dataUrl: renderSignalGridToDataUrl(grid, options),
        coordinates: grid.coordinates,
        bbox: grid.bbox,
        width: grid.width,
        height: grid.height,
        poleId: pole.id ?? options.poleId ?? null
    };
}

/** One raster per selected pole entry from optimization result. */
export function buildCoverageRasters(selectedPoles = [], units = 'miles', options = {}) {
    return selectedPoles.map((entry) =>
        createAntennaCoverageRaster(entry.pole, entry.sectors, units, {
            ...options,
            poleId: entry.pole.id
        })
    );
}

/** Bbox polygon FC for layer metadata / fit bounds. */
export function buildCoverageRasterBoundsGeojson(coverageRasters = []) {
    const features = coverageRasters
        .filter((raster) => raster?.bbox?.length === 4)
        .map((raster, index) => {
            const [west, south, east, north] = raster.bbox;
            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [west, south],
                        [east, south],
                        [east, north],
                        [west, north],
                        [west, south]
                    ]]
                },
                properties: {
                    coverage_shape: 'coverage_raster_bounds',
                    pole_id: raster.poleId ?? `pole-${index + 1}`
                }
            };
        });

    return { type: 'FeatureCollection', features };
}

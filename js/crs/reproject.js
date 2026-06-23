/**
 * Geometry reprojection via proj4.
 */
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { createSpatialDataset } from '../core/data-model.js';
import { getProj4, normalizeCrsCode, resolveCrs } from './registry.js';
import { isDisplayReady } from './detect.js';

/**
 * @param {[number, number]} coord
 * @param {string} fromCrs
 * @param {string} toCrs
 * @returns {Promise<[number, number]>}
 */
export async function reprojectCoordinate(coord, fromCrs, toCrs) {
    const from = normalizeCrsCode(fromCrs);
    const to = normalizeCrsCode(toCrs);
    if (from === to) return [...coord];

    const fromDef = await resolveCrs(from);
    const toDef = await resolveCrs(to);
    if (!fromDef || !toDef) {
        throw new AppError(`Cannot reproject: unresolved CRS (${from} → ${to})`, ErrorCategory.VALIDATION);
    }

    const proj4 = await getProj4();
    const out = proj4(from, to, coord);
    if (!out || out.length < 2 || !Number.isFinite(out[0]) || !Number.isFinite(out[1])) {
        throw new AppError(`Reprojection failed for ${from} → ${to}`, ErrorCategory.VALIDATION);
    }
    return [out[0], out[1]];
}

/**
 * @param {object|null} geometry
 * @param {string} fromCrs
 * @param {string} toCrs
 * @returns {Promise<object|null>}
 */
export async function reprojectGeometry(geometry, fromCrs, toCrs) {
    if (!geometry || !geometry.coordinates) return geometry;
    const from = normalizeCrsCode(fromCrs);
    const to = normalizeCrsCode(toCrs);
    if (from === to) return geometry;

    const clone = JSON.parse(JSON.stringify(geometry));
    await _walkCoords(clone.coordinates, clone.type, async (coord) => {
        return reprojectCoordinate(coord, from, to);
    });
    return clone;
}

async function _walkCoords(coords, type, fn) {
    if (type === 'Point') {
        const projected = await fn([coords[0], coords[1]]);
        coords[0] = projected[0];
        coords[1] = projected[1];
        return;
    }
    if (type === 'MultiPoint' || type === 'LineString') {
        for (let i = 0; i < coords.length; i++) {
            coords[i] = await fn(coords[i]);
        }
        return;
    }
    if (type === 'MultiLineString' || type === 'Polygon') {
        for (let i = 0; i < coords.length; i++) {
            for (let j = 0; j < coords[i].length; j++) {
                coords[i][j] = await fn(coords[i][j]);
            }
        }
        return;
    }
    if (type === 'MultiPolygon') {
        for (let i = 0; i < coords.length; i++) {
            for (let j = 0; j < coords[i].length; j++) {
                for (let k = 0; k < coords[i][j].length; k++) {
                    coords[i][j][k] = await fn(coords[i][j][k]);
                }
            }
        }
    }
}

/**
 * @param {object} fc FeatureCollection
 * @param {string} fromCrs
 * @param {string} toCrs
 * @returns {Promise<object>}
 */
export async function reprojectFeatureCollection(fc, fromCrs, toCrs) {
    const features = [];
    for (const f of fc.features || []) {
        features.push({
            ...f,
            geometry: f.geometry
                ? await reprojectGeometry(f.geometry, fromCrs, toCrs)
                : null
        });
    }
    return { type: 'FeatureCollection', features };
}

/**
 * @param {object} dataset spatial dataset
 * @param {{ fromCrs?: string, toCrs: string, name?: string }} options
 * @returns {Promise<object>}
 */
export async function reprojectDataset(dataset, options) {
    const fromCrs = normalizeCrsCode(options.fromCrs || dataset.schema?.crs || 'EPSG:4326');
    const toCrs = normalizeCrsCode(options.toCrs);
    const fc = await reprojectFeatureCollection(dataset.geojson, fromCrs, toCrs);

    const out = createSpatialDataset(
        options.name || `${dataset.name}_reproject_${toCrs.replace(':', '')}`,
        fc,
        {
            format: 'derived',
            originalCrs: fromCrs,
            crsDetected: 'reproject',
            sourceLayer: dataset.name
        },
        { crs: toCrs, crsWkt: null }
    );

    if (!isDisplayReady(toCrs)) {
        out.source.crsWarning = `Layer reprojected to ${toCrs} — not suitable for web map display.`;
    }

    return out;
}

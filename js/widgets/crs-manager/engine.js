/**
 * CRS Manager widget — layer audit, batch reproject planning, favorites.
 * Hidden from GIS Widgets panel; see docs/CRS_MANAGER.md.
 */
import { isSpatialLayer } from '../../core/data-model.js';
import { crsLabel, listPresetCrs, normalizeCrsCode } from '../../crs/registry.js';
import { isDisplayReady } from '../../crs/detect.js';
import {
    getLayerCrs,
    hasProjectedCoordinates,
    isLayerDisplayReady,
    layerCrsWarning
} from '../../crs/layer-crs.js';

const FAVORITES_KEY = 'gis-toolbox-crs-favorites';

export function loadCrsFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveCrsFavorites(favorites = []) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.slice(0, 20)));
}

export function auditLayers(layers = []) {
    return layers
        .filter(isSpatialLayer)
        .map((layer) => {
            const crs = getLayerCrs(layer);
            const coordsProjected = hasProjectedCoordinates(layer.geojson);
            const displayReady = isLayerDisplayReady(layer);
            return {
                id: layer.id,
                name: layer.name,
                crs,
                crsLabel: crsLabel(crs),
                displayReady,
                warning: coordsProjected && displayReady === false && isDisplayReady(crs)
                    ? 'Coordinates look projected but the layer is labeled as geographic. Reproject to WGS84 (EPSG:4326).'
                    : layerCrsWarning(layer),
                featureCount: layer.schema?.featureCount ?? layer.geojson?.features?.length ?? 0
            };
        });
}

export function buildBatchReprojectPlan(layerIds = [], targetCrs = 'EPSG:4326') {
    const normalized = normalizeCrsCode(targetCrs);
    return layerIds.map((id) => ({
        layerId: id,
        toCrs: normalized,
        outputSuffix: `_reproject_${normalized.replace(':', '')}`
    }));
}

/**
 * Validate a batch reproject step before transforming coordinates.
 * @param {string} fromCrs
 * @param {string} toCrs
 * @returns {{ ok: boolean, message?: string, warning?: string }}
 */
export function validateBatchReprojectStep(fromCrs, toCrs) {
    const from = normalizeCrsCode(fromCrs);
    const to = normalizeCrsCode(toCrs);

    if (from === to) {
        return {
            ok: false,
            message: `Layer is already in ${crsLabel(from)}. Choose a different target CRS to transform coordinates.`
        };
    }

    if (!isDisplayReady(to)) {
        return {
            ok: false,
            message: `Target ${crsLabel(to)} is not suitable for web map display. Choose WGS 84 (EPSG:4326) so the new layer appears on the map.`
        };
    }

    return { ok: true };
}

/**
 * Whether a layer needs reprojection before it can display correctly on the web map.
 * @param {object} layer
 * @param {object|null|undefined} geojson
 * @returns {boolean}
 */
export function layerNeedsReprojection(layer, geojson) {
    if (!isSpatialLayer(layer)) return false;
    if (hasProjectedCoordinates(geojson || layer.geojson)) return true;
    return !isLayerDisplayReady(layer);
}

/**
 * Validate whether a layer should be batch-reprojected.
 * @param {object} layer
 * @param {object|null|undefined} geojson
 * @param {string} fromCrs
 * @param {string} toCrs
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateLayerForReproject(layer, geojson, fromCrs, toCrs) {
    if (!layerNeedsReprojection(layer, geojson)) {
        return {
            ok: false,
            message: `"${layer.name}" is already map-ready (${crsLabel(getLayerCrs(layer))}). It should display correctly — no reprojection needed.`
        };
    }

    return validateBatchReprojectStep(fromCrs, toCrs);
}

export function getAvailablePresets() {
    return listPresetCrs();
}

/** Presets suitable as batch reproject targets for web map display. */
export function getMapDisplayTargetPresets() {
    return listPresetCrs().filter((preset) => isDisplayReady(preset.code));
}

export function validateCustomWkt(wkt) {
    const trimmed = String(wkt || '').trim();
    if (!trimmed) return { valid: false, message: 'WKT is required.' };
    if (trimmed.length < 20) return { valid: false, message: 'WKT looks too short.' };
    return { valid: true, code: `CUSTOM:${Date.now()}` };
}

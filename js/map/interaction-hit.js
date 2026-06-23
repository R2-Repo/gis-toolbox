/**
 * Wider invisible hit targets for thin line / outline layers.
 */

export const LINE_HIT_MIN_WIDTH_PX = 12;
export const LINE_HIT_EXTRA_PX = 6;
export const FEATURE_QUERY_BUFFER_PX = 12;

/**
 * @param {number|Array} visibleWidth MapLibre line-width paint value
 * @returns {number|Array}
 */
export function buildLineHitWidth(visibleWidth) {
    if (typeof visibleWidth === 'number' && Number.isFinite(visibleWidth)) {
        return Math.max(LINE_HIT_MIN_WIDTH_PX, visibleWidth + LINE_HIT_EXTRA_PX);
    }
    if (Array.isArray(visibleWidth)) {
        return ['max', LINE_HIT_MIN_WIDTH_PX, ['+', visibleWidth, LINE_HIT_EXTRA_PX]];
    }
    return LINE_HIT_MIN_WIDTH_PX;
}

export function lineHitLayerId(visibleLayerId) {
    return `${visibleLayerId}-hit`;
}

export function isInteractionHitLayerId(layerId) {
    return layerId.endsWith('-line-hit') || layerId.endsWith('-outline-hit');
}

/**
 * Skip binding clicks on visible thin stroke when a hit layer handles interaction.
 * @param {string} layerId
 * @param {string[]} layerIds
 */
export function shouldSkipClickBinding(layerId, layerIds) {
    if (layerId.endsWith('-line') && !layerId.endsWith('-line-hit')) {
        return layerIds.includes(lineHitLayerId(layerId));
    }
    if (layerId.endsWith('-outline') && !layerId.endsWith('-outline-hit')) {
        return layerIds.includes(lineHitLayerId(layerId));
    }
    return false;
}

/**
 * Orchestrates map effects after a query run — keeps engine/UI separate from visuals.
 */

/**
 * @param {import('../widget-types.js').WidgetContext} ctx
 * @param {object} params
 * @param {string} params.layerId
 * @param {object} params.layer
 * @param {number[]} params.matchingIndices
 * @param {object} params.resultBehavior
 * @param {string} [params.zoomMode]
 * @returns {{ lastResultLayerId: string|null, message: string, hasMatches: boolean }}
 */
export function applyQueryResultEffects(ctx, {
    layerId,
    layer,
    matchingIndices = [],
    resultBehavior = {},
    zoomMode = 'all'
}) {
    const map = ctx.mapService;
    const count = matchingIndices.length;

    if (count === 0) {
        map.clearQueryResults?.();
        return {
            lastResultLayerId: null,
            message: 'No matching features found',
            hasMatches: false
        };
    }

    const {
        highlightResults = true,
        zoomToResults = true,
        selectResults = false,
        flashResults = false,
        createResultLayer = false
    } = resultBehavior;

    if (highlightResults || flashResults) {
        map.showQueryResults?.(layerId, matchingIndices);
    } else {
        map.clearQueryResults?.();
    }

    if (flashResults) {
        map.pulseQueryResults?.({ mode: 'pulse' });
    }

    if (zoomToResults) {
        const effectiveZoomMode = zoomMode === 'none' ? 'none' : zoomMode;
        if (effectiveZoomMode !== 'none') {
            map.fitToFeatureIndices?.(layerId, matchingIndices, { mode: effectiveZoomMode });
        }
    }

    if (selectResults) {
        map.selectFeatures?.(layerId, matchingIndices);
        ctx.setActiveLayer?.(layerId);
    }

    let lastResultLayerId = null;
    if (createResultLayer) {
        lastResultLayerId = createQueryResultLayer(ctx, { layer, matchingIndices });
    }

    return {
        lastResultLayerId,
        message: `Matching features found: ${count}`,
        hasMatches: true
    };
}

/**
 * @param {import('../widget-types.js').WidgetContext} ctx
 * @param {object} params
 * @param {string} params.layerId
 * @param {object} params.layer
 * @param {number[]} params.matchingIndices
 * @param {object} params.resultBehavior
 * @param {string} [params.zoomMode]
 */
export function reapplyQueryResultEffects(ctx, params) {
    return applyQueryResultEffects(ctx, params);
}

/**
 * Clear temporary query overlay only — does not delete layers or clear selection.
 * @param {import('../widget-types.js').WidgetContext} ctx
 */
export function clearQueryResultOverlay(ctx) {
    ctx.mapService.clearQueryResults?.();
}

/**
 * @param {import('../widget-types.js').WidgetContext} ctx
 * @param {object} params
 * @param {object} params.layer
 * @param {number[]} params.matchingIndices
 * @returns {string|null} new layer id
 */
export function createQueryResultLayer(ctx, { layer, matchingIndices = [] }) {
    const features = (layer?.geojson?.features || []).filter((feature, index) => {
        const idx = feature?.properties?._featureIndex;
        const featureIndex = Number.isInteger(idx) ? idx : index;
        return matchingIndices.includes(featureIndex);
    });

    if (!features.length) {
        ctx.showToast?.('No matching features to add', 'warning');
        return null;
    }

    const dataset = ctx.createSpatialDataset(
        `${layer.name}_query_results`,
        { type: 'FeatureCollection', features },
        { format: 'derived' }
    );
    ctx.addLayer(dataset);
    ctx.mapService.addLayer(dataset, ctx.getLayers().indexOf(dataset), { fit: false });
    ctx.refreshUI?.();
    ctx.showToast?.(`Created result layer with ${features.length} feature(s)`, 'success');
    return dataset.id;
}

/**
 * @param {import('../widget-types.js').WidgetContext} ctx
 * @param {object} params
 * @param {string} params.layerId
 * @param {number[]} params.matchingIndices
 */
export function selectQueryResults(ctx, { layerId, matchingIndices = [] }) {
    if (!matchingIndices.length) {
        ctx.showToast?.('No results to select', 'warning');
        return;
    }
    ctx.mapService.selectFeatures?.(layerId, matchingIndices);
    ctx.setActiveLayer?.(layerId);
    ctx.showToast?.(`Selected ${matchingIndices.length} feature(s)`, 'success');
}

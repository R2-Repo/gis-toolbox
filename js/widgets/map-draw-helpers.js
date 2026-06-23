/**
 * Shared map drawing helpers for GIS widgets.
 * @param {import('./widget-types.js').WidgetContext} ctx
 */
export function createAreaDrawHandlers(ctx) {
    const { mapService, showToast, turf } = ctx;

    async function draw(mode) {
        if (mode === 'rectangle') {
            const bbox = await mapService.startRectangleDraw('Click and drag to draw your search area');
            if (!bbox) return null;
            const [west, south, east, north] = bbox;
            const analysisArea = turf.bboxPolygon([west, south, east, north]);
            mapService.showTempFeature(analysisArea, 15000);
            return { analysisArea, areaSource: 'draw' };
        }

        if (mode === 'polygon') {
            const geometry = await mapService.startSketchPolygon({
                bannerText: 'Click to add points. Double-click or Enter to finish the area.',
                onInsufficientVertices: () => showToast('Need at least 3 points to make an area', 'warning')
            });
            if (!geometry) return null;
            const analysisArea = turf.feature(geometry);
            mapService.showTempFeature(analysisArea, 15000);
            return { analysisArea, areaSource: 'draw' };
        }

        if (mode === 'circle') {
            const geometry = await mapService.startSketchCirclePolygon({
                bannerText: 'Click center, then click for radius. Esc cancels.',
                onRadiusTooSmall: () => showToast('Radius too small', 'warning')
            });
            if (!geometry) return null;
            const analysisArea = turf.feature(geometry);
            mapService.showTempFeature(analysisArea, 15000);
            return { analysisArea, areaSource: 'draw' };
        }

        return null;
    }

    async function useLayerArea(areaLayerId) {
        const layer = ctx.getLayers().find((entry) => entry.id === areaLayerId);
        if (!layer?.geojson?.features?.length) {
            throw new Error('Selected polygon layer has no features.');
        }

        const polygons = layer.geojson.features.filter((feature) =>
            feature?.geometry &&
            (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
        );

        if (polygons.length === 0) {
            throw new Error('No polygon features found in selected layer.');
        }

        let analysisArea = polygons[0];
        if (polygons.length > 1) {
            try {
                let merged = polygons[0];
                for (let i = 1; i < polygons.length; i++) {
                    const unionResult = turf.union(turf.featureCollection([merged, polygons[i]]));
                    if (unionResult) merged = unionResult;
                }
                analysisArea = merged;
            } catch {
                const hull = turf.convex(turf.featureCollection(polygons));
                analysisArea = hull || polygons[0];
            }
        }

        mapService.showTempFeature(analysisArea, 15000);
        return { analysisArea, areaSource: 'layer' };
    }

    return { draw, useLayerArea };
}

/**
 * @param {import('./widget-types.js').WidgetContext} ctx
 */
export function createCenterlineDrawHandlers(ctx) {
    const { mapService, showToast, turf } = ctx;

    async function drawCenterline() {
        const geometry = await mapService.startSketchPolyline({
            bannerText: 'Click to add points. Double-click or Enter to finish the centerline.',
            onInsufficientVertices: () => showToast('Need at least 2 points for a centerline', 'warning')
        });
        if (!geometry) return null;
        const feature = turf.feature(geometry);
        mapService.cancelInteraction?.();
        return feature;
    }

    return { drawCenterline };
}

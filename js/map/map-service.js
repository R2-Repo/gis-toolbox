import mapManager from './map-manager.js';

export function createMapService({ mapAdapter = mapManager } = {}) {
    return {
        get map() {
            return mapAdapter.map;
        },
        get dataLayers() {
            return mapAdapter.dataLayers;
        },
        init(container) {
            if (!container) {
                throw new Error('MapService.init requires a container element or id');
            }
            return mapAdapter.init(container);
        },
        destroy() {
            return mapAdapter.destroy();
        },
        getMap() {
            return mapAdapter.getMap();
        },
        resize() {
            return mapAdapter.resize();
        },
        addLayer(dataset, colorIndex = 0, options = {}) {
            return mapAdapter.addLayer(dataset, colorIndex, options);
        },
        addLayerIncremental(dataset, colorIndex = 0, options = {}) {
            return mapAdapter.addLayerIncremental(dataset, colorIndex, options);
        },
        addWorkspaceLayer(dataset, colorIndex = 0, options = {}) {
            return mapAdapter.addWorkspaceLayer(dataset, colorIndex, options);
        },
        refreshWorkspaceLayerViewport(layerId) {
            return mapAdapter.refreshWorkspaceLayerViewport(layerId);
        },
        appendFeaturesToLayer(layerId, dataset, rawFeatures, startIndex) {
            return mapAdapter.appendFeaturesToLayer(layerId, dataset, rawFeatures, startIndex);
        },
        removeLayer(layerId) {
            return mapAdapter.removeLayer(layerId);
        },
        toggleLayer(layerId, visible) {
            return mapAdapter.toggleLayer(layerId, visible);
        },
        setLayerScaleRange(layerId, range, latitude) {
            return mapAdapter.setLayerScaleRange(layerId, range, latitude);
        },
        restyleLayer(layerId, dataset, style) {
            return mapAdapter.restyleLayer(layerId, dataset, style);
        },
        refreshLayerData(dataset) {
            return mapAdapter.refreshLayerData(dataset);
        },
        getLayerStyle(layerId) {
            return mapAdapter.getLayerStyle(layerId);
        },
        setLayerStyle(layerId, style) {
            return mapAdapter.setLayerStyle(layerId, style);
        },
        syncLayerOrder(orderedIds) {
            return mapAdapter.syncLayerOrder(orderedIds);
        },
        getCurrentBasemap() {
            return mapAdapter.currentBasemap;
        },
        setCurrentBasemap(key) {
            mapAdapter.currentBasemap = key;
            return mapAdapter.currentBasemap;
        },
        setBasemap(key) {
            return mapAdapter.setBasemap(key);
        },
        is3DEnabled() {
            return !!mapAdapter._3dEnabled;
        },
        set3DEnabled(enabled) {
            mapAdapter._3dEnabled = !!enabled;
            return !!mapAdapter._3dEnabled;
        },
        getLayerStyles() {
            return mapAdapter._layerStyles;
        },
        getLayerStylesRecord() {
            const map = mapAdapter._layerStyles;
            if (!map) return {};
            return Object.fromEntries(map.entries());
        },
        setLayerStylesRecord(record = {}) {
            if (!mapAdapter._layerStyles) return;
            mapAdapter._layerStyles.clear();
            for (const [id, style] of Object.entries(record)) {
                mapAdapter._layerStyles.set(id, style);
            }
        },
        enable3D() {
            return mapAdapter.enable3D();
        },
        disable3D() {
            return mapAdapter.disable3D();
        },
        fitToAll() {
            return mapAdapter.fitToAll();
        },
        fitToLayers(layerIds) {
            return mapAdapter.fitToLayers(layerIds);
        },
        getBounds() {
            return mapAdapter.getBounds();
        },
        hasImportFence() {
            return !!mapAdapter.hasImportFence;
        },
        clearImportFence() {
            return mapAdapter.clearImportFence();
        },
        startImportFenceDraw() {
            return mapAdapter.startImportFenceDraw();
        },
        setImportFenceFromBbox(bbox) {
            return mapAdapter.setImportFenceFromBbox(bbox);
        },
        getImportFenceEsriEnvelope() {
            return mapAdapter.getImportFenceEsriEnvelope();
        },
        getSearchLatLng() {
            return mapAdapter.getSearchLatLng();
        },
        clearSearchMarker() {
            return mapAdapter._clearSearchMarker();
        },
        getLayerRecord(layerId) {
            return mapAdapter.dataLayers?.get?.(layerId) ?? null;
        },
        getLayerIds() {
            return [...(mapAdapter.dataLayers?.keys?.() ?? [])];
        },
        isSelectionMode() {
            return mapAdapter.isSelectionMode();
        },
        setActiveLayerId(layerId) {
            return mapAdapter.setActiveLayerId?.(layerId);
        },
        getActiveLayerId() {
            return mapAdapter._activeLayerId ?? null;
        },
        getTotalSelectionCount() {
            return mapAdapter.getTotalSelectionCount?.() ?? 0;
        },
        selectFeatures(layerId, indices) {
            return mapAdapter.selectFeatures?.(layerId, indices);
        },
        blockSelection() {
            return mapAdapter.blockSelection?.();
        },
        unblockSelection() {
            return mapAdapter.unblockSelection?.();
        },
        isSelectionBlocked() {
            return !mapAdapter.isSelectionMode?.();
        },
        getSelectedIndices(layerId) {
            return mapAdapter.getSelectedIndices(layerId);
        },
        getSelectedFeatures(layerId, geojson) {
            return mapAdapter.getSelectedFeatures(layerId, geojson);
        },
        getSelectionCount(layerId) {
            return mapAdapter.getSelectionCount(layerId);
        },
        enterSelectionMode() {
            return mapAdapter.enterSelectionMode();
        },
        exitSelectionMode() {
            return mapAdapter.exitSelectionMode();
        },
        clearSelection(layerId = null) {
            return mapAdapter.clearSelection(layerId);
        },
        selectAll(layerId, geojson) {
            return mapAdapter.selectAll(layerId, geojson);
        },
        invertSelection(layerId, geojson) {
            return mapAdapter.invertSelection(layerId, geojson);
        },
        startPointPick(prompt) {
            return mapAdapter.startPointPick(prompt);
        },
        startTwoPointPick(prompt1, prompt2) {
            return mapAdapter.startTwoPointPick(prompt1, prompt2);
        },
        startRouteTwoPointPick(routeLine, prompt1, prompt2, options) {
            return mapAdapter.startRouteTwoPointPick(routeLine, prompt1, prompt2, options);
        },
        startRectangleDraw(prompt) {
            return mapAdapter.startRectangleDraw(prompt);
        },
        startSketchPolygon(options = {}) {
            return mapAdapter.startSketchPolygon(options);
        },
        startSketchPolyline(options = {}) {
            return mapAdapter.startSketchPolyline(options);
        },
        startSketchCirclePolygon(options = {}) {
            return mapAdapter.startSketchCirclePolygon(options);
        },
        showInteractionBanner(text, onCancel) {
            return mapAdapter.showInteractionBanner?.(text, onCancel);
        },
        cancelInteraction() {
            return mapAdapter.cancelInteraction?.();
        },
        highlightFeature(layerId, featureIndex, originalColor) {
            return mapAdapter.highlightFeature?.(layerId, featureIndex, originalColor);
        },
        clearHighlight() {
            return mapAdapter.clearHighlight?.();
        },
        showTempFeature(geojson, duration) {
            return mapAdapter.showTempFeature(geojson, duration);
        },
        showRouteMilepostPreview(geojson, duration) {
            return mapAdapter.showRouteMilepostPreview?.(geojson, duration);
        },
        showProjectStationingPreview(geojson, duration) {
            return mapAdapter.showProjectStationingPreview?.(geojson, duration);
        },
        removeTempFeature(entry) {
            return mapAdapter.removeTempFeature?.(entry);
        },
        clearTempFeatures() {
            return mapAdapter.clearTempFeatures?.();
        },
        hasPopupHits() {
            return Array.isArray(mapAdapter._popupHits) && mapAdapter._popupHits.length > 0;
        },
        cyclePopup(dir = 1) {
            if (!Array.isArray(mapAdapter._popupHits) || mapAdapter._popupHits.length === 0) return;
            const len = mapAdapter._popupHits.length;
            mapAdapter._popupIndex = (mapAdapter._popupIndex + dir + len) % len;
            return mapAdapter._renderCyclePopup?.();
        },
        getActivePopupHit() {
            const hits = mapAdapter._popupHits;
            const idx = mapAdapter._popupIndex;
            return hits?.[idx] ?? null;
        },
        closePopup() {
            return mapAdapter._closePopup?.();
        },
        findFeaturesNearClick(latlng, clickedLayerId, clickedFeatureIndex) {
            return mapAdapter._findFeaturesNearClick(latlng, clickedLayerId, clickedFeatureIndex);
        },
        queryFeaturesAtPoint(point, layerIds = null, bufferPx) {
            return mapAdapter._queryFeaturesAtPoint(point, layerIds, bufferPx);
        },
        showMultiPopup(hits, latlng) {
            return mapAdapter._showMultiPopup(hits, latlng);
        },
        showPopup(feature, layer, latlng) {
            return mapAdapter.showPopup(feature, layer, latlng);
        },
        isOrbiting() {
            return !!mapAdapter.isOrbiting;
        },
        startCameraOrbit(center) {
            return mapAdapter.startCameraOrbit(center);
        },
        stopCameraOrbit() {
            return mapAdapter.stopCameraOrbit();
        },
    };
}

export const mapService = createMapService();
export default mapService;

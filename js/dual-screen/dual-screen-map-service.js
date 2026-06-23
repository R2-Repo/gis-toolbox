/**
 * Dual Screen Mode — MapService decorator.
 * Intercepts map operations while dual-screen is active and relays them to the
 * secondary window protocol, while preserving single-window behavior by default.
 */

function buildFenceEnvelope(bbox) {
    const [west, south, east, north] = bbox;
    return {
        xmin: west,
        ymin: south,
        xmax: east,
        ymax: north,
        spatialReference: { wkid: 4326 }
    };
}

/**
 * @param {object} mapApi - mapService-shaped API object.
 * @param {object} coordinator - dualScreenCoordinator-shaped object.
 * @returns {() => void} uninstall function restoring original methods.
 */
export function installDualScreenMapServiceDecorator(mapApi, coordinator) {
    if (!mapApi || typeof mapApi !== 'object') {
        throw new Error('installDualScreenMapServiceDecorator requires a map API object');
    }
    if (!coordinator || typeof coordinator !== 'object') {
        throw new Error('installDualScreenMapServiceDecorator requires a coordinator object');
    }

    const originals = {
        addLayer: mapApi.addLayer?.bind(mapApi),
        removeLayer: mapApi.removeLayer?.bind(mapApi),
        toggleLayer: mapApi.toggleLayer?.bind(mapApi),
        syncLayerOrder: mapApi.syncLayerOrder?.bind(mapApi),
        refreshLayerData: mapApi.refreshLayerData?.bind(mapApi),
        setLayerStyle: mapApi.setLayerStyle?.bind(mapApi),
        fitToAll: mapApi.fitToAll?.bind(mapApi),
        fitToLayers: mapApi.fitToLayers?.bind(mapApi),
        setBasemap: mapApi.setBasemap?.bind(mapApi),
        enable3D: mapApi.enable3D?.bind(mapApi),
        disable3D: mapApi.disable3D?.bind(mapApi),
        getBounds: mapApi.getBounds?.bind(mapApi),
        resize: mapApi.resize?.bind(mapApi),
        getMap: mapApi.getMap?.bind(mapApi),
        getImportFenceEsriEnvelope: mapApi.getImportFenceEsriEnvelope?.bind(mapApi)
    };

    mapApi.addLayer = function addLayer(dataset, colorIndex = 0, options = {}) {
        if (!coordinator.isActive) return originals.addLayer?.(dataset, colorIndex, options);
        coordinator.broadcastLayerAdd(dataset, colorIndex, options);
        if (options.fit) coordinator.broadcastFit('fitLayer', { layerId: dataset?.id });
        return undefined;
    };

    mapApi.removeLayer = function removeLayer(layerId) {
        if (!coordinator.isActive) return originals.removeLayer?.(layerId);
        coordinator.broadcastLayerRemove(layerId);
        return undefined;
    };

    mapApi.toggleLayer = function toggleLayer(layerId, visible) {
        if (!coordinator.isActive) return originals.toggleLayer?.(layerId, visible);
        coordinator.syncLayersChanged();
        return undefined;
    };

    mapApi.syncLayerOrder = function syncLayerOrder(orderedIds) {
        if (!coordinator.isActive) return originals.syncLayerOrder?.(orderedIds);
        coordinator.broadcastLayerOrder(orderedIds);
        return undefined;
    };

    mapApi.setLayerStyle = function setLayerStyle(layerId, style) {
        const result = originals.setLayerStyle?.(layerId, style);
        if (coordinator.isActive) coordinator.syncLayersChanged();
        return result;
    };

    mapApi.refreshLayerData = function refreshLayerData(dataset) {
        if (!coordinator.isActive) return originals.refreshLayerData?.(dataset);
        coordinator.syncLayersChanged();
        return undefined;
    };

    mapApi.fitToAll = function fitToAll() {
        if (!coordinator.isActive) return originals.fitToAll?.();
        coordinator.broadcastFit('fitAll');
        return undefined;
    };

    mapApi.fitToLayers = function fitToLayers(layerIds) {
        if (!coordinator.isActive) return originals.fitToLayers?.(layerIds);
        coordinator.broadcastFit('fitLayers', { layerIds });
        return undefined;
    };

    mapApi.setBasemap = function setBasemap(key) {
        if (!coordinator.isActive) return originals.setBasemap?.(key);
        mapApi.setCurrentBasemap?.(key);
        coordinator.syncLayersChanged();
        return undefined;
    };

    mapApi.enable3D = function enable3D() {
        if (!coordinator.isActive) return originals.enable3D?.();
        mapApi.set3DEnabled?.(true);
        coordinator.syncLayersChanged();
        return undefined;
    };

    mapApi.disable3D = function disable3D() {
        if (!coordinator.isActive) return originals.disable3D?.();
        mapApi.set3DEnabled?.(false);
        coordinator.syncLayersChanged();
        return undefined;
    };

    mapApi.getBounds = function getBounds() {
        if (!coordinator.isActive) return originals.getBounds?.();
        return coordinator.getBounds();
    };

    // Safe in both modes: map-manager resize already no-ops when no map exists.
    mapApi.resize = function resize() {
        return originals.resize?.();
    };

    mapApi.getMap = function getMap() {
        if (coordinator.isActive) return null;
        return originals.getMap?.();
    };

    mapApi.getImportFenceEsriEnvelope = function getImportFenceEsriEnvelope() {
        if (coordinator.isActive && coordinator._fenceBbox) {
            return buildFenceEnvelope(coordinator._fenceBbox);
        }
        return originals.getImportFenceEsriEnvelope?.();
    };

    return function uninstallDualScreenMapServiceDecorator() {
        Object.entries(originals).forEach(([name, fn]) => {
            if (typeof fn === 'function') {
                mapApi[name] = fn;
            }
        });
    };
}


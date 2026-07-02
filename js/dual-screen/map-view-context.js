/**
 * Dual Screen Mode — map zoom/latitude for UI panels when primary map is torn down.
 */

/**
 * @param {object} mapService
 * @param {object} coordinator - dualScreenCoordinator-shaped object
 * @returns {{ zoom: number, latitude: number, viewport: object | null }}
 */
export function getMapViewContextForUi(mapService, coordinator) {
    if (coordinator?.isActive) {
        const vp = coordinator._lastViewport;
        if (vp?.center) {
            const lat = Array.isArray(vp.center) ? vp.center[1] : vp.center?.lat;
            return {
                zoom: vp.zoom ?? 7,
                latitude: lat ?? 0,
                viewport: {
                    center: vp.center,
                    zoom: vp.zoom ?? 7,
                    bearing: vp.bearing ?? 0,
                    pitch: vp.pitch ?? 0
                }
            };
        }
        const bounds = coordinator.getBounds?.();
        if (bounds) {
            const south = bounds.getSouth();
            const north = bounds.getNorth();
            return {
                zoom: 7,
                latitude: (south + north) / 2,
                viewport: null
            };
        }
        return { zoom: 7, latitude: 0, viewport: null };
    }

    const map = mapService?.getMap?.();
    const center = map?.getCenter?.();
    const zoom = map?.getZoom?.() ?? 7;
    const latitude = center?.lat ?? 0;
    let viewport = null;
    if (center) {
        viewport = {
            center: [center.lng, center.lat],
            zoom,
            bearing: map.getBearing?.() ?? 0,
            pitch: map.getPitch?.() ?? 0
        };
    }
    return { zoom, latitude, viewport };
}

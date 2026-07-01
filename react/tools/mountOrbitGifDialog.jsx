import { mountIsland } from '../mountIsland.jsx';
import { OrbitGifDialog } from './OrbitGifDialog.jsx';

export function mountOrbitGifDialog(element, props = {}) {
    if (!element) throw new Error('mountOrbitGifDialog: target element is required');
    return { unmount: mountIsland(element, OrbitGifDialog, props) };
}

/**
 * Build modal props from map state and callbacks for orbit GIF setup.
 * @param {object} mapService
 * @param {{ getActiveLayer?: () => object|null, overlay?: HTMLElement|null }} [ctx]
 */
export function buildOrbitGifModalOptions(mapService, ctx = {}) {
    const map = mapService?.getMap?.();
    const center = map?.getCenter?.() ?? { lng: 0, lat: 0 };
    let zoom = map?.getZoom?.() ?? 15;
    zoom = Math.min(18, Math.max(13, zoom));
    const pitch = Math.min(85, Math.max(0, map?.getPitch?.() ?? 55));

    let layerCenter = null;
    let activeLayerName = null;
    let layer = ctx.getActiveLayer?.();
    if (!layer && mapService.getActiveLayerId && mapService.getLayerRecord) {
        const activeId = mapService.getActiveLayerId();
        if (activeId) layer = mapService.getLayerRecord(activeId);
    }
    if (layer?.geojson?.features?.length && typeof globalThis.turf !== 'undefined') {
        try {
            const centroid = globalThis.turf.centroid(layer.geojson);
            layerCenter = {
                lng: centroid.geometry.coordinates[0],
                lat: centroid.geometry.coordinates[1]
            };
            activeLayerName = layer.name || 'Active layer';
        } catch {
            // ignore invalid geometry
        }
    }

    const overlay = ctx.overlay ?? null;

    return {
        initialCenter: { lng: center.lng, lat: center.lat },
        initialZoom: zoom,
        initialPitch: pitch,
        activeLayerName,
        layerCenter,
        onGetMapCenter: () => {
            const c = mapService.getMap()?.getCenter?.();
            return c ? { lng: c.lng, lat: c.lat } : { lng: center.lng, lat: center.lat };
        },
        onPickCenter: async () => {
            if (overlay) overlay.style.visibility = 'hidden';
            try {
                const pt = await mapService.startPointPick('Click the orbit center on the map');
                if (!pt) return null;
                return { lng: pt[0], lat: pt[1] };
            } finally {
                if (overlay) overlay.style.visibility = '';
            }
        },
        onPreview: async (settings) => {
            if (overlay) overlay.style.visibility = 'hidden';
            try {
                await mapService.prepareOrbitView(settings.center, {
                    zoom: settings.zoom,
                    pitch: settings.pitch
                });
            } finally {
                if (overlay) overlay.style.visibility = '';
            }
        }
    };
}

/**
 * @param {object} mapService
 * @param {{ getActiveLayer?: () => object|null }} [ctx]
 */
export async function pickOrbitGifSettingsModal(mapService, ctx = {}) {
    const { showModal } = await import('../../js/ui/modals.js');
    const rootId = `orbit-gif-settings-${Date.now()}`;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        showModal('Orbit GIF settings', `<div id="${rootId}"></div>`, {
            width: '520px',
            onMount: async (overlay, close) => {
                const root = overlay.querySelector(`#${rootId}`);
                if (!root) {
                    finish(null);
                    close(null);
                    return;
                }
                let mounted = null;
                const dismiss = (result) => {
                    mounted?.unmount?.();
                    finish(result);
                    close(result != null);
                };
                mounted = mountOrbitGifDialog(root, {
                    ...buildOrbitGifModalOptions(mapService, { ...ctx, overlay }),
                    onConfirm: (result) => dismiss(result),
                    onCancel: () => dismiss(null)
                });
            }
        });
    });
}

/**
 * Open orbit GIF settings, then record if confirmed.
 * @param {object} mapService
 * @param {{ getActiveLayer?: () => object|null }} [ctx]
 */
export async function pickAndExportOrbitGif(mapService, ctx = {}) {
    const settings = await pickOrbitGifSettingsModal(mapService, ctx);
    if (!settings) return null;
    const { exportOrbitGif } = await import('../../js/map/map-export.js');
    return exportOrbitGif(mapService, settings);
}

/**
 * Dual Screen Mode — secondary map window entry
 */
import mapService from './map/map-service.js';
import { DualScreenChannel } from './dual-screen/channel.js';
import {
    MessageType,
    createMessage,
    shouldApplyViewport
} from './dual-screen/protocol.js';
import { createSpatialDataset } from './core/data-model.js';
import {
    initSecondaryClient,
    applyMapToast,
    handleDrawCmdMessage,
    broadcastViewportFromMap,
    applyRemoteSelection
} from './dual-screen/secondary-client.js';

const ROLE = 'secondary';
let channel = null;
let suppressViewportBroadcast = false;
let lastAppliedViewportId = null;
let viewportDebounce = null;
let byeSent = false;

function post(type, payload) {
    channel?.post(createMessage(ROLE, type, payload));
}

function sendBye() {
    if (byeSent) return;
    byeSent = true;
    post(MessageType.BYE, {});
}

function applySnapshot(payload) {
    if (!payload) return;
    const { layers, viewport, basemap, is3d } = payload;

    if (basemap && basemap !== mapService.getCurrentBasemap()) {
        mapService.setBasemap(basemap);
        syncBasemapToggle(basemap);
    }

    if (mapService.getMap()) {
        for (const id of mapService.getLayerIds()) {
            mapService.removeLayer(id);
        }
    }

    (layers || []).forEach((entry, i) => {
        if (!entry.geojson) return;
        const dataset = createSpatialDataset(entry.name, entry.geojson, entry.source || { format: 'sync' });
        dataset.id = entry.id;
        dataset.visible = entry.visible !== false;
        if (entry.scaleRangeEnabled) {
            dataset.scaleRangeEnabled = true;
            dataset.minScale = entry.minScale ?? null;
            dataset.maxScale = entry.maxScale ?? null;
        }
        if (entry.style) mapService.setLayerStyle(entry.id, entry.style);
        mapService.addLayer(dataset, i, { fit: false });
    });

    if (is3d) mapService.enable3D();
    else mapService.disable3D();
    syncDimensionToggle(!!is3d);

    if (payload.activeLayerId) {
        mapService.setActiveLayerId(payload.activeLayerId);
    }

    const map = mapService.getMap();
    if (viewport && map) {
        suppressViewportBroadcast = true;
        map.jumpTo({
            center: viewport.center,
            zoom: viewport.zoom,
            bearing: viewport.bearing ?? 0,
            pitch: viewport.pitch ?? 0
        });
        suppressViewportBroadcast = false;
    }
}

function applyLayerAdd(payload) {
    const { dataset, colorIndex, fit } = payload || {};
    if (!dataset?.geojson) return;
    const layer = createSpatialDataset(dataset.name, dataset.geojson, dataset.source || { format: 'sync' });
    layer.id = dataset.id;
    layer.visible = dataset.visible !== false;
    if (dataset.scaleRangeEnabled) {
        layer.scaleRangeEnabled = true;
        layer.minScale = dataset.minScale ?? null;
        layer.maxScale = dataset.maxScale ?? null;
    }
    mapService.removeLayer(layer.id);
    mapService.addLayer(layer, colorIndex ?? 0, { fit: !!fit });
}

function applyLayerRemove(payload) {
    if (payload?.id) mapService.removeLayer(payload.id);
}

function applyLayerOrder(payload) {
    const { orderedIds } = payload || {};
    if (!orderedIds?.length) return;
    mapService.syncLayerOrder(orderedIds);
}

function applyViewport(payload) {
    const map = mapService.getMap();
    if (!payload || !map) return;
    if (payload.command === 'fitAll') {
        mapService.fitToAll();
        return;
    }
    if (payload.command === 'fitLayers' && payload.layerIds?.length) {
        mapService.fitToLayers(payload.layerIds);
        return;
    }
    if (payload.center) {
        map.jumpTo({
            center: payload.center,
            zoom: payload.zoom ?? map.getZoom(),
            bearing: payload.bearing ?? 0,
            pitch: payload.pitch ?? 0
        });
    }
}

function syncBasemapToggle(basemap) {
    document.querySelectorAll('#basemap-toggle .header-toggle-option').forEach(b => {
        b.classList.toggle('active', b.dataset.value === basemap);
    });
}

function syncDimensionToggle(is3d) {
    document.querySelectorAll('#dimension-toggle .header-toggle-option').forEach(b => {
        b.classList.toggle('active', b.dataset.value === (is3d ? '3d' : '2d'));
    });
}

function broadcastViewport() {
    const map = mapService.getMap();
    if (suppressViewportBroadcast || !map) return;
    post(MessageType.VIEWPORT, broadcastViewportFromMap(map));
}

function onMapReady() {
    const map = mapService.getMap();
    if (!map) return;
    map.on('moveend', () => {
        clearTimeout(viewportDebounce);
        viewportDebounce = setTimeout(broadcastViewport, 80);
    });
}

function handleMessage(msg) {
    switch (msg.type) {
        case MessageType.SNAPSHOT:
            applySnapshot(msg.payload);
            break;
        case MessageType.LAYER_ADD:
            applyLayerAdd(msg.payload);
            break;
        case MessageType.LAYER_REMOVE:
            applyLayerRemove(msg.payload);
            break;
        case MessageType.LAYER_ORDER:
            applyLayerOrder(msg.payload);
            break;
        case MessageType.VIEWPORT:
            if (shouldApplyViewport(msg, ROLE, lastAppliedViewportId)) {
                lastAppliedViewportId = msg.msgId;
                suppressViewportBroadcast = true;
                applyViewport(msg.payload);
                suppressViewportBroadcast = false;
            }
            break;
        case MessageType.DRAW_CMD:
            handleDrawCmdMessage(msg.payload, post);
            break;
        case MessageType.TOAST:
            applyMapToast(msg.payload);
            break;
        case MessageType.SELECTION:
            applyRemoteSelection(msg.payload);
            break;
        case MessageType.BYE:
            window.close();
            break;
        default:
            break;
    }
}

function setupHeaderControls() {
    document.getElementById('btn-exit-dual-screen')?.addEventListener('click', () => {
        sendBye();
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'gis-toolbox-dual-screen-exit' }, window.location.origin);
            }
        } catch (_) { /* ignore */ }
        window.close();
    });

    document.getElementById('basemap-toggle')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-value]');
        if (!btn) return;
        syncBasemapToggle(btn.dataset.value);
        mapService.setBasemap(btn.dataset.value);
        post(MessageType.MAP_CHROME, { basemap: btn.dataset.value });
    });

    document.getElementById('dimension-toggle')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-value]');
        if (!btn) return;
        const is3d = btn.dataset.value === '3d';
        syncDimensionToggle(is3d);
        if (is3d) mapService.enable3D();
        else mapService.disable3D();
        post(MessageType.MAP_CHROME, { is3d });
    });
}

function boot() {
    if (typeof BroadcastChannel === 'undefined') {
        document.body.innerHTML = '<p style="padding:24px">Dual Screen requires BroadcastChannel (modern browser).</p>';
        return;
    }

    channel = new DualScreenChannel(ROLE, handleMessage);
    mapService.init('map-container');
    setupHeaderControls();
    initSecondaryClient({ post, getChannel: () => channel });

    const map = mapService.getMap();
    if (map?.loaded()) onMapReady();
    else map?.once('load', onMapReady);

    post(MessageType.HELLO, {});

    const teardownSecondary = () => {
        sendBye();
        channel?.close();
        channel = null;
    };

    window.addEventListener('beforeunload', teardownSecondary);
    window.addEventListener('pagehide', (e) => {
        if (!e.persisted) teardownSecondary();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

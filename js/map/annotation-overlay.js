/**
 * Screen-space annotation overlay for 3D terrain mode.
 * Renders text and straight callout leaders independent of terrain draping.
 */
import {
    ANNOTATION_TYPES,
    DEFAULT_ANNOTATION_STYLE,
    isAnnotationFeature
} from './map-annotations.js';

export const ANNOTATION_SCREEN_LIFT_PX = 36;

/**
 * @param {{ x: number, y: number }} groundPx
 * @param {number} [liftPx]
 * @returns {{ x: number, y: number }}
 */
export function liftedLabelPoint(groundPx, liftPx = ANNOTATION_SCREEN_LIFT_PX) {
    return { x: groundPx.x, y: groundPx.y - liftPx };
}

/**
 * @param {object} map
 * @param {number} lng
 * @param {number} lat
 * @returns {{ x: number, y: number } | null}
 */
export function projectLngLat(map, lng, lat) {
    if (!map?.project || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    const p = map.project([lng, lat]);
    return { x: p.x, y: p.y };
}

/**
 * @param {object} props
 * @returns {string}
 */
export function buildLabelTextShadow(props = {}) {
    const w = Number(props.haloWidth ?? DEFAULT_ANNOTATION_STYLE.haloWidth);
    const c = props.haloColor ?? DEFAULT_ANNOTATION_STYLE.haloColor;
    if (w <= 0) return 'none';
    const r = Math.max(1, Math.round(w));
    const parts = [];
    for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            parts.push(`${dx}px ${dy}px 0 ${c}`);
        }
    }
    return parts.join(', ');
}

/**
 * @param {string} anchor
 * @returns {string}
 */
export function labelTransformForAnchor(anchor = 'center') {
    switch (anchor) {
        case 'top': return 'translate(-50%, 0)';
        case 'bottom': return 'translate(-50%, -100%)';
        case 'left': return 'translate(0, -50%)';
        case 'right': return 'translate(-100%, -50%)';
        case 'top-left': return 'translate(0, 0)';
        case 'top-right': return 'translate(-100%, 0)';
        case 'bottom-left': return 'translate(0, -100%)';
        case 'bottom-right': return 'translate(-100%, -100%)';
        default: return 'translate(-50%, -50%)';
    }
}

/**
 * @param {object} map
 * @param {object[]} features
 * @param {number} [liftPx]
 * @returns {object[]}
 */
export function collectAnnotationRenderItems(map, features, liftPx = ANNOTATION_SCREEN_LIFT_PX) {
    const items = [];
    for (const f of features || []) {
        if (!isAnnotationFeature(f)) continue;
        const props = { ...DEFAULT_ANNOTATION_STYLE, ...(f.properties || {}) };
        const type = props._annotationType;

        if (type === ANNOTATION_TYPES.TEXT && f.geometry?.type === 'Point') {
            const [lng, lat] = f.geometry.coordinates;
            const ground = projectLngLat(map, lng, lat);
            if (!ground) continue;
            items.push({
                type: 'text',
                props,
                anchor: ground,
                label: liftedLabelPoint(ground, liftPx)
            });
            continue;
        }

        if (type === ANNOTATION_TYPES.CALLOUT && f.geometry?.type === 'LineString') {
            const coords = f.geometry.coordinates;
            if (!coords?.length || coords.length < 2) continue;
            const [aLng, aLat] = coords[0];
            const [lLng, lLat] = coords[coords.length - 1];
            const anchor = projectLngLat(map, aLng, aLat);
            const labelGround = projectLngLat(map, lLng, lLat);
            if (!anchor || !labelGround) continue;
            items.push({
                type: 'callout',
                props,
                anchor,
                label: liftedLabelPoint(labelGround, liftPx)
            });
        }
    }
    return items;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export class AnnotationOverlayManager {
    /**
     * @param {import('maplibre-gl').Map} map
     */
    constructor(map) {
        this.map = map;
        /** @type {Map<string, { layerIds: string[] }>} */
        this._registry = new Map();
        this._active = false;
        this._root = null;
        this._svg = null;
        this._labelsHost = null;
        this._bound = false;
        this._refreshRaf = null;
        this._scheduleRefreshHandler = () => this.scheduleRefresh();
        this._getGeojsonForDataset = null;
    }

    /**
     * @param {(datasetId: string) => object|null|undefined} fn
     */
    setGeojsonProvider(fn) {
        this._getGeojsonForDataset = fn;
    }

    bind() {
        if (this._bound || !this.map) return;
        this._bound = true;
        this.map.on('move', this._scheduleRefreshHandler);
        this.map.on('zoom', this._scheduleRefreshHandler);
        this.map.on('rotate', this._scheduleRefreshHandler);
        this.map.on('pitch', this._scheduleRefreshHandler);
        this.map.on('resize', this._scheduleRefreshHandler);
    }

    unbind() {
        if (!this._bound || !this.map) return;
        this._bound = false;
        this.map.off('move', this._scheduleRefreshHandler);
        this.map.off('zoom', this._scheduleRefreshHandler);
        this.map.off('rotate', this._scheduleRefreshHandler);
        this.map.off('pitch', this._scheduleRefreshHandler);
        this.map.off('resize', this._scheduleRefreshHandler);
    }

    destroy() {
        this.unbind();
        if (this._refreshRaf) {
            cancelAnimationFrame(this._refreshRaf);
            this._refreshRaf = null;
        }
        this._root?.remove();
        this._root = null;
        this._svg = null;
        this._labelsHost = null;
        this._registry.clear();
    }

    /**
     * @param {string} datasetId
     * @param {string[]} layerIds
     */
    register(datasetId, layerIds = []) {
        if (!datasetId) return;
        this._registry.set(datasetId, { layerIds: [...layerIds] });
        if (this._active) this.scheduleRefresh();
    }

    /**
     * @param {string} datasetId
     */
    unregister(datasetId) {
        this._registry.delete(datasetId);
        if (this._active) this.scheduleRefresh();
    }

    /**
     * @param {boolean} active
     */
    setActive(active) {
        const next = !!active;
        if (this._active === next) {
            if (next) this.scheduleRefresh();
            return;
        }
        this._active = next;
        if (next) {
            this._ensureDom();
            this._root.style.display = '';
            this.scheduleRefresh();
        } else if (this._root) {
            this._root.style.display = 'none';
            this._clearDom();
        }
    }

    scheduleRefresh = () => {
        if (!this._active || !this.map) return;
        if (this._refreshRaf) return;
        this._refreshRaf = requestAnimationFrame(() => {
            this._refreshRaf = null;
            this.refresh();
        });
    };

    refresh() {
        if (!this._active || !this.map) return;
        this._ensureDom();
        const features = this._collectFeatures();
        const items = collectAnnotationRenderItems(this.map, features);
        this._render(items);
    }

    _collectFeatures() {
        const out = [];
        if (!this._getGeojsonForDataset) return out;
        for (const datasetId of this._registry.keys()) {
            const geojson = this._getGeojsonForDataset(datasetId);
            for (const f of geojson?.features || []) {
                if (isAnnotationFeature(f)) out.push(f);
            }
        }
        return out;
    }

    _ensureDom() {
        if (this._root || !this.map) return;
        const container = this.map.getContainer();
        if (!container) return;

        const root = document.createElement('div');
        root.className = 'annotation-overlay';
        root.setAttribute('aria-hidden', 'true');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'annotation-overlay-lines');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        const labelsHost = document.createElement('div');
        labelsHost.className = 'annotation-overlay-labels';

        root.appendChild(svg);
        root.appendChild(labelsHost);
        container.appendChild(root);

        this._root = root;
        this._svg = svg;
        this._labelsHost = labelsHost;
    }

    _clearDom() {
        if (this._svg) this._svg.innerHTML = '';
        if (this._labelsHost) this._labelsHost.innerHTML = '';
    }

    /**
     * @param {object[]} items
     */
    _render(items) {
        if (!this._svg || !this._labelsHost) return;
        this._svg.innerHTML = '';
        this._labelsHost.innerHTML = '';

        for (const item of items) {
            if (item.type === 'callout') {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', String(item.anchor.x));
                line.setAttribute('y1', String(item.anchor.y));
                line.setAttribute('x2', String(item.label.x));
                line.setAttribute('y2', String(item.label.y));
                line.setAttribute('stroke', item.props.leaderColor || DEFAULT_ANNOTATION_STYLE.leaderColor);
                line.setAttribute('stroke-width', String(item.props.leaderWidth || DEFAULT_ANNOTATION_STYLE.leaderWidth));
                line.setAttribute('stroke-linecap', 'round');
                this._svg.appendChild(line);

                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', String(item.anchor.x));
                dot.setAttribute('cy', String(item.anchor.y));
                dot.setAttribute('r', '4');
                dot.setAttribute('fill', item.props.leaderColor || DEFAULT_ANNOTATION_STYLE.leaderColor);
                dot.setAttribute('stroke', '#ffffff');
                dot.setAttribute('stroke-width', '1');
                this._svg.appendChild(dot);
            }

            const text = item.props.text;
            if (!text) continue;

            const el = document.createElement('div');
            el.className = 'annotation-overlay-label';
            el.style.left = `${item.label.x}px`;
            el.style.top = `${item.label.y}px`;
            el.style.transform = labelTransformForAnchor(item.props.anchor);
            el.style.fontSize = `${item.props.fontSize || DEFAULT_ANNOTATION_STYLE.fontSize}px`;
            el.style.color = item.props.color || DEFAULT_ANNOTATION_STYLE.color;
            el.style.textShadow = buildLabelTextShadow(item.props);
            if (item.props.rotation) {
                el.style.rotate = `${item.props.rotation}deg`;
            }
            el.textContent = text;
            this._labelsHost.appendChild(el);
        }
    }

    /**
     * Draw annotations onto a 2D export canvas (3D mode).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} [pixelScale]
     */
    compositeOntoCanvas(ctx, pixelScale = 1) {
        if (!this.map || !ctx) return;
        const features = this._collectFeatures();
        const items = collectAnnotationRenderItems(this.map, features);
        const scale = pixelScale || 1;

        for (const item of items) {
            if (item.type === 'callout') {
                const color = item.props.leaderColor || DEFAULT_ANNOTATION_STYLE.leaderColor;
                const width = (item.props.leaderWidth || DEFAULT_ANNOTATION_STYLE.leaderWidth) * scale;
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(item.anchor.x * scale, item.anchor.y * scale);
                ctx.lineTo(item.label.x * scale, item.label.y * scale);
                ctx.stroke();

                ctx.fillStyle = color;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1 * scale;
                ctx.beginPath();
                ctx.arc(item.anchor.x * scale, item.anchor.y * scale, 4 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            const text = item.props.text;
            if (!text) continue;

            const fontSize = (item.props.fontSize || DEFAULT_ANNOTATION_STYLE.fontSize) * scale;
            const color = item.props.color || DEFAULT_ANNOTATION_STYLE.color;
            const haloColor = item.props.haloColor ?? DEFAULT_ANNOTATION_STYLE.haloColor;
            const haloWidth = Number(item.props.haloWidth ?? DEFAULT_ANNOTATION_STYLE.haloWidth) * scale;
            const x = item.label.x * scale;
            const y = item.label.y * scale;

            ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.lineJoin = 'round';

            if (haloWidth > 0) {
                ctx.strokeStyle = haloColor;
                ctx.lineWidth = haloWidth * 2;
                ctx.strokeText(text, x, y);
            }
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
        }
    }
}

/**
 * @param {import('maplibre-gl').Map} map
 * @param {string} datasetId
 * @param {boolean} visible
 */
export function setAnnotationLayersVisibility(map, datasetId, visible) {
    if (!map || !datasetId) return;
    const visibility = visible ? 'visible' : 'none';
    for (const suffix of ['-ann-callout-line', '-ann-anchor', '-ann-labels']) {
        const id = `${datasetId}${suffix}`;
        if (map.getLayer(id)) {
            map.setLayoutProperty(id, 'visibility', visibility);
        }
    }
}

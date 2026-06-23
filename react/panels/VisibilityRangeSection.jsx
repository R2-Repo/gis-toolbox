import { useCallback, useEffect, useRef, useState } from 'react';
import {
    scaleToZoom,
    zoomToScale,
    getCurrentMapScale,
    normalizeScaleRange
} from '../../js/map/scale-range.js';
import { CollapsibleSection } from '../ui/CollapsibleSection.jsx';

function formatScale(scale) {
    if (scale == null || !Number.isFinite(scale)) return '';
    return Math.round(scale).toLocaleString();
}

function parseScaleInput(value) {
    const cleaned = String(value ?? '').replace(/,/g, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function parseZoomInput(value) {
    const cleaned = String(value ?? '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

export function VisibilityRangeSection({
    layer,
    mapZoom = 7,
    mapLatitude = 0,
    onChange
}) {
    const normalized = normalizeScaleRange(layer || {});
    const [enabled, setEnabled] = useState(normalized.scaleRangeEnabled);
    const [minScale, setMinScale] = useState(normalized.minScale);
    const [maxScale, setMaxScale] = useState(normalized.maxScale);
    const [minZoom, setMinZoom] = useState(
        normalized.minScale != null ? scaleToZoom(normalized.minScale, mapLatitude) : null
    );
    const [maxZoom, setMaxZoom] = useState(
        normalized.maxScale != null ? scaleToZoom(normalized.maxScale, mapLatitude) : null
    );
    const debounceRef = useRef(null);
    const layerId = layer?.id;

    useEffect(() => {
        const n = normalizeScaleRange(layer || {});
        setEnabled(n.scaleRangeEnabled);
        setMinScale(n.minScale);
        setMaxScale(n.maxScale);
        setMinZoom(n.minScale != null ? scaleToZoom(n.minScale, mapLatitude) : null);
        setMaxZoom(n.maxScale != null ? scaleToZoom(n.maxScale, mapLatitude) : null);
    }, [layerId, layer?.scaleRangeEnabled, layer?.minScale, layer?.maxScale, mapLatitude]);

    const emitChange = useCallback((patch) => {
        if (!layerId || !onChange) return;
        onChange(layerId, patch);
    }, [layerId, onChange]);

    const scheduleEmit = useCallback((patch) => {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => emitChange(patch), 300);
    }, [emitChange]);

    const buildPatch = useCallback((overrides = {}) => {
        return normalizeScaleRange({
            scaleRangeEnabled: overrides.scaleRangeEnabled ?? enabled,
            minScale: overrides.minScale !== undefined ? overrides.minScale : minScale,
            maxScale: overrides.maxScale !== undefined ? overrides.maxScale : maxScale
        });
    }, [enabled, minScale, maxScale]);

    const onToggle = (checked) => {
        setEnabled(checked);
        emitChange(buildPatch({ scaleRangeEnabled: checked }));
    };

    const onMinScaleChange = (value) => {
        const scale = parseScaleInput(value);
        const zoom = scale != null ? scaleToZoom(scale, mapLatitude) : null;
        setMinScale(scale);
        setMinZoom(zoom);
        scheduleEmit(buildPatch({ minScale: scale }));
    };

    const onMaxScaleChange = (value) => {
        const scale = parseScaleInput(value);
        const zoom = scale != null ? scaleToZoom(scale, mapLatitude) : null;
        setMaxScale(scale);
        setMaxZoom(zoom);
        scheduleEmit(buildPatch({ maxScale: scale }));
    };

    const onMinZoomChange = (value) => {
        const zoom = parseZoomInput(value);
        const scale = zoom != null ? zoomToScale(zoom, mapLatitude) : null;
        setMinZoom(zoom);
        setMinScale(scale);
        scheduleEmit(buildPatch({ minScale: scale }));
    };

    const onMaxZoomChange = (value) => {
        const zoom = parseZoomInput(value);
        const scale = zoom != null ? zoomToScale(zoom, mapLatitude) : null;
        setMaxZoom(zoom);
        setMaxScale(scale);
        scheduleEmit(buildPatch({ maxScale: scale }));
    };

    const setFromMapMin = () => {
        const scale = Math.round(getCurrentMapScale(mapZoom, mapLatitude));
        const zoom = scaleToZoom(scale, mapLatitude);
        setMinScale(scale);
        setMinZoom(zoom);
        emitChange(buildPatch({ minScale: scale }));
    };

    const setFromMapMax = () => {
        const scale = Math.round(getCurrentMapScale(mapZoom, mapLatitude));
        const zoom = scaleToZoom(scale, mapLatitude);
        setMaxScale(scale);
        setMaxZoom(zoom);
        emitChange(buildPatch({ maxScale: scale }));
    };

    const clearRange = () => {
        setMinScale(null);
        setMaxScale(null);
        setMinZoom(null);
        setMaxZoom(null);
        emitChange(buildPatch({ minScale: null, maxScale: null }));
    };

    const currentScale = formatScale(getCurrentMapScale(mapZoom, mapLatitude));

    return (
        <CollapsibleSection title="Visibility Range" defaultOpen={false}>
            <label className="toggle mb-8">
                <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
                <span className="toggle-track"></span>
                <span>Use scale range</span>
            </label>
            <p className="text-muted text-xs mb-8">
                ArcGIS-style visible scale. Current map: 1:{currentScale} (zoom {mapZoom?.toFixed?.(1) ?? mapZoom})
            </p>

            <div className="style-row">
                <label title="Farthest zoomed-out scale where layer stays visible">Out beyond (1:)</label>
                <input
                    type="text"
                    className="input input-sm"
                    placeholder="e.g. 500,000"
                    value={formatScale(minScale)}
                    disabled={!enabled}
                    onChange={(e) => onMinScaleChange(e.target.value)}
                />
                <input
                    type="number"
                    className="input input-sm"
                    style={{ width: 64 }}
                    placeholder="zoom"
                    step="0.1"
                    value={minZoom ?? ''}
                    disabled={!enabled}
                    onChange={(e) => onMinZoomChange(e.target.value)}
                />
            </div>

            <div className="style-row">
                <label title="Farthest zoomed-in scale where layer stays visible">In beyond (1:)</label>
                <input
                    type="text"
                    className="input input-sm"
                    placeholder="e.g. 10,000"
                    value={formatScale(maxScale)}
                    disabled={!enabled}
                    onChange={(e) => onMaxScaleChange(e.target.value)}
                />
                <input
                    type="number"
                    className="input input-sm"
                    style={{ width: 64 }}
                    placeholder="zoom"
                    step="0.1"
                    value={maxZoom ?? ''}
                    disabled={!enabled}
                    onChange={(e) => onMaxZoomChange(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <button type="button" className="btn btn-sm btn-secondary" disabled={!enabled} onClick={setFromMapMin}>
                    Set min from map
                </button>
                <button type="button" className="btn btn-sm btn-secondary" disabled={!enabled} onClick={setFromMapMax}>
                    Set max from map
                </button>
                <button type="button" className="btn btn-sm btn-secondary" disabled={!enabled} onClick={clearRange}>
                    Clear
                </button>
            </div>
        </CollapsibleSection>
    );
}

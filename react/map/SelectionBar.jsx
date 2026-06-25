import { useMemo } from 'react';
import { useEventBus } from '../hooks/useEventBus.js';

export function SelectionBar({
    getActiveLayer,
    getSelectionCount,
    onDeleteSelected
}) {
    useEventBus('selection:changed');
    useEventBus('selection:modeChanged');
    useEventBus('layer:active');

    const layer = getActiveLayer?.() ?? null;
    const count = layer ? (getSelectionCount?.(layer.id) ?? 0) : 0;
    const total = layer?.geojson?.features?.length || 0;

    const visible = count > 0;

    const barClass = useMemo(
        () => (visible ? 'selection-bar selection-bar--header' : 'selection-bar selection-bar--header hidden'),
        [visible]
    );

    if (!visible) return null;

    return (
        <>
            <div className="header-sep" aria-hidden="true" />
            <div className={barClass}>
                <span className="sel-count">{count}</span>
                {' '}of {total} selected
                <button
                    type="button"
                    className="btn btn-sm sel-delete"
                    title="Delete selected features"
                    onClick={() => onDeleteSelected?.()}
                >
                    Delete
                </button>
            </div>
        </>
    );
}

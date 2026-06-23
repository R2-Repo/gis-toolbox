import { useMemo } from 'react';
import { useEventBus } from '../hooks/useEventBus.js';

export function SelectionBar({
    getActiveLayer,
    getSelectionCount,
    onSelectAll,
    onInvertSelection,
    onDeleteSelected,
    onClearSelection,
    hintText = 'Click to select · Shift+click add/remove · Shift+drag empty area to box-select · Esc clear'
}) {
    useEventBus('selection:changed');
    useEventBus('selection:modeChanged');
    useEventBus('layer:active');

    const layer = getActiveLayer?.() ?? null;
    const count = layer ? (getSelectionCount?.(layer.id) ?? 0) : 0;
    const total = layer?.geojson?.features?.length || 0;
    const layerName = layer?.name || '';

    const visible = count > 0;

    const barClass = useMemo(
        () => (visible ? 'selection-bar' : 'selection-bar hidden'),
        [visible]
    );

    return (
        <>
            <div id="selection-hint" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                {hintText}
            </div>
            <div className={barClass}>
                {visible ? (
                    <>
                        <span className="sel-count">{count}</span>
                        {' '}of {total} selected
                        {layerName ? (
                            <> on <strong>{layerName}</strong></>
                        ) : null}
                        <button type="button" className="sel-btn" onClick={() => onSelectAll?.()}>All</button>
                        <button type="button" className="sel-btn" onClick={() => onInvertSelection?.()}>Invert</button>
                        <button
                            type="button"
                            className="sel-btn"
                            title="Delete selected features"
                            style={{ color: 'var(--error)' }}
                            onClick={() => onDeleteSelected?.()}
                        >
                            Delete
                        </button>
                        <button type="button" className="sel-btn sel-clear" onClick={() => onClearSelection?.()}>Clear</button>
                    </>
                ) : null}
            </div>
        </>
    );
}

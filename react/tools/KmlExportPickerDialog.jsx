import { useMemo, useState } from 'react';

export function KmlExportPickerDialog({
    layers = [],
    activeLayerId = null,
    ext = 'kmz',
    activeLayerName = '',
    onCancel,
    onActiveOnly,
    onExportSelected,
    onWarnNoSelection
}) {
    const initialSelected = useMemo(() => new Set(layers.map((layer) => layer.id)), [layers]);
    const [selectedIds, setSelectedIds] = useState(initialSelected);

    const toggleLayer = (layerId) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(layerId)) {
                next.delete(layerId);
            } else {
                next.add(layerId);
            }
            return next;
        });
    };

    const handleExport = () => {
        if (selectedIds.size === 0) {
            onWarnNoSelection?.();
            return;
        }
        const selected = layers
            .filter((layer) => selectedIds.has(layer.id))
            .map((layer) => layer.id);
        onExportSelected?.(selected);
    };

    return (
        <div>
            <p style={{ marginBottom: '12px' }}>
                Export <strong>{activeLayerName}</strong> only, or select layers to combine into a single <strong>.{ext}</strong> with one folder per layer.
            </p>
            <div className="merge-layer-list" id="kmz-layer-list-react">
                {layers.map((layer) => (
                    <label key={layer.id} className="merge-layer-item">
                        <input
                            type="checkbox"
                            checked={selectedIds.has(layer.id)}
                            onChange={() => toggleLayer(layer.id)}
                        />
                        <span>
                            {layer.name}
                            {layer.id === activeLayerId ? (
                                <small style={{ color: 'var(--primary)' }}> (active)</small>
                            ) : null}
                        </span>
                        <span className="merge-feat-count">{layer.featureCount}</span>
                    </label>
                ))}
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button className="btn btn-secondary active-only-btn" onClick={() => onActiveOnly?.()}>Active layer only</button>
                <button className="btn btn-primary multi-btn" onClick={handleExport}>Export selected (multi-folder)</button>
            </div>
        </div>
    );
}

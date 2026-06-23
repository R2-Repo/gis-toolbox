import { useMemo, useState } from 'react';

export function MergeLayersDialog({ layers = [], onCancel, onMerge }) {
    const defaultSelection = useMemo(() => new Set(layers.map((layer) => layer.index)), [layers]);
    const [selectedIndices, setSelectedIndices] = useState(defaultSelection);

    const toggleLayer = (layerIndex) => {
        setSelectedIndices((current) => {
            const next = new Set(current);
            if (next.has(layerIndex)) {
                next.delete(layerIndex);
            } else {
                next.add(layerIndex);
            }
            return next;
        });
    };

    return (
        <div>
            <p style={{ marginBottom: '8px' }}>Select layers to merge. A <code>source_file</code> field will be added.</p>
            <div className="merge-layer-list">
                {layers.map((layer) => (
                    <label key={layer.index} className="merge-layer-item">
                        <input
                            type="checkbox"
                            checked={selectedIndices.has(layer.index)}
                            onChange={() => toggleLayer(layer.index)}
                        />
                        <span>{layer.name}</span>
                        <span className="merge-feat-count">{layer.featureCount} features</span>
                    </label>
                ))}
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary confirm-btn"
                    onClick={() => onMerge?.(Array.from(selectedIndices))}
                >
                    Merge Selected
                </button>
            </div>
        </div>
    );
}

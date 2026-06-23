import { useMemo, useState } from 'react';

export function LineIntersectDialog({ layers = [], onCancel, onFind }) {
    const firstLayerId = useMemo(() => (layers[0]?.id || ''), [layers]);
    const secondLayerId = useMemo(() => (layers[1]?.id || layers[0]?.id || ''), [layers]);
    const [layerId1, setLayerId1] = useState(firstLayerId);
    const [layerId2, setLayerId2] = useState(secondLayerId);

    return (
        <div>
            <p>Find all points where two line layers cross each other.</p>
            <div className="form-group">
                <label>Line layer 1</label>
                <select value={layerId1} onChange={(e) => setLayerId1(e.target.value)}>
                    {layers.map((layer) => (
                        <option key={layer.id} value={layer.id}>
                            {layer.name} ({layer.count})
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Line layer 2</label>
                <select value={layerId2} onChange={(e) => setLayerId2(e.target.value)}>
                    {layers.map((layer) => (
                        <option key={layer.id} value={layer.id}>
                            {layer.name} ({layer.count})
                        </option>
                    ))}
                </select>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onFind?.({ layerId1, layerId2 })}
                    disabled={!layerId1 || !layerId2}
                >
                    Find Intersections
                </button>
            </div>
        </div>
    );
}

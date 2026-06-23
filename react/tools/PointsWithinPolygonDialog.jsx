import { useMemo, useState } from 'react';

export function PointsWithinPolygonDialog({
    pointLayers = [],
    polygonLayers = [],
    onCancel,
    onFind
}) {
    const firstPointLayerId = useMemo(() => (pointLayers[0]?.id || ''), [pointLayers]);
    const firstPolygonLayerId = useMemo(() => (polygonLayers[0]?.id || ''), [polygonLayers]);
    const [pointLayerId, setPointLayerId] = useState(firstPointLayerId);
    const [polygonLayerId, setPolygonLayerId] = useState(firstPolygonLayerId);

    return (
        <div>
            <p>Find all points from one layer that fall inside polygons from another layer.</p>
            <div className="form-group">
                <label>Point layer</label>
                <select value={pointLayerId} onChange={(e) => setPointLayerId(e.target.value)}>
                    {pointLayers.map((layer) => (
                        <option key={layer.id} value={layer.id}>
                            {layer.name} ({layer.count})
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Polygon layer</label>
                <select value={polygonLayerId} onChange={(e) => setPolygonLayerId(e.target.value)}>
                    {polygonLayers.map((layer) => (
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
                    onClick={() => onFind?.({ pointLayerId, polygonLayerId })}
                    disabled={!pointLayerId || !polygonLayerId}
                >
                    Find Points
                </button>
            </div>
        </div>
    );
}

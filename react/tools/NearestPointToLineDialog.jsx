import { useMemo, useState } from 'react';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function NearestPointToLineDialog({
    pointLayers = [],
    lineLayers = [],
    onCancel,
    onFind
}) {
    const firstPointLayerId = useMemo(() => (pointLayers[0]?.id || ''), [pointLayers]);
    const firstLineLayerId = useMemo(() => (lineLayers[0]?.id || ''), [lineLayers]);
    const [pointLayerId, setPointLayerId] = useState(firstPointLayerId);
    const [lineLayerId, setLineLayerId] = useState(firstLineLayerId);
    const [units, setUnits] = useState('feet');

    return (
        <div>
            <p>Find which point in a point layer is closest to a specific line feature.</p>
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
                <label>Line layer</label>
                <select value={lineLayerId} onChange={(e) => setLineLayerId(e.target.value)}>
                    {lineLayers.map((layer) => (
                        <option key={layer.id} value={layer.id}>
                            {layer.name} ({layer.count})
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Units</label>
                <select value={units} onChange={(e) => setUnits(e.target.value)}>
                    {UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                        </option>
                    ))}
                </select>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onFind?.({ pointLayerId, lineLayerId, units })}
                    disabled={!pointLayerId || !lineLayerId}
                >
                    Find
                </button>
            </div>
        </div>
    );
}

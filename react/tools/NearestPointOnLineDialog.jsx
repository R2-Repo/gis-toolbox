import { useMemo, useState } from 'react';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function NearestPointOnLineDialog({ layers = [], onCancel, onPickPoint }) {
    const firstLayerId = useMemo(() => (layers[0]?.id || ''), [layers]);
    const [layerId, setLayerId] = useState(firstLayerId);
    const [units, setUnits] = useState('feet');

    return (
        <div>
            <p>Click a point on the map to find the closest spot on a line (snaps to the line).</p>
            <div className="form-group">
                <label>Line layer</label>
                <select value={layerId} onChange={(e) => setLayerId(e.target.value)}>
                    {layers.map((layer) => (
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
                    onClick={() => onPickPoint?.({ layerId, units })}
                    disabled={!layerId}
                >
                    Pick Point on Map
                </button>
            </div>
        </div>
    );
}

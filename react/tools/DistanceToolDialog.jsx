import { useState } from 'react';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function DistanceToolDialog({ onCancel, onPick }) {
    const [units, setUnits] = useState('feet');

    return (
        <div>
            <p>Click two points on the map to measure the straight-line distance between them.</p>
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
                <button className="btn btn-primary apply-btn" onClick={() => onPick?.(units)}>Pick Points on Map</button>
            </div>
        </div>
    );
}

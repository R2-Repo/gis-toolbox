import { useState } from 'react';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function DestinationToolDialog({ onCancel, onPick }) {
    const [distance, setDistance] = useState('100');
    const [bearing, setBearing] = useState('0');
    const [units, setUnits] = useState('feet');

    return (
        <div>
            <p>Click a starting point, then enter a distance and bearing to find the destination point.</p>
            <div className="form-group">
                <label>Distance</label>
                <input
                    type="number"
                    value={distance}
                    min="0.001"
                    step="1"
                    onChange={(e) => setDistance(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Bearing (degrees, 0=North, 90=East)</label>
                <input
                    type="number"
                    value={bearing}
                    min="-180"
                    max="360"
                    step="1"
                    onChange={(e) => setBearing(e.target.value)}
                />
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
                    onClick={() => onPick?.({
                        dist: parseFloat(distance),
                        brng: parseFloat(bearing),
                        units
                    })}
                >
                    Pick Origin on Map
                </button>
            </div>
        </div>
    );
}

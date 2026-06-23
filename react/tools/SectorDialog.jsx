import { useState } from 'react';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function SectorDialog({ onCancel, onPickCenter }) {
    const [radius, setRadius] = useState('100');
    const [bearing1, setBearing1] = useState('0');
    const [bearing2, setBearing2] = useState('90');
    const [units, setUnits] = useState('feet');

    return (
        <div>
            <p>Create a pie-slice shaped polygon from a center point, radius, and two compass bearings.</p>
            <div className="form-group">
                <label>Radius</label>
                <input
                    type="number"
                    value={radius}
                    min="0.001"
                    step="1"
                    onChange={(e) => setRadius(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Start bearing (degrees, 0=North)</label>
                <input
                    type="number"
                    value={bearing1}
                    min="-180"
                    max="360"
                    step="1"
                    onChange={(e) => setBearing1(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>End bearing (degrees)</label>
                <input
                    type="number"
                    value={bearing2}
                    min="-180"
                    max="360"
                    step="1"
                    onChange={(e) => setBearing2(e.target.value)}
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
                    onClick={() => onPickCenter?.({
                        radius: parseFloat(radius),
                        b1: parseFloat(bearing1),
                        b2: parseFloat(bearing2),
                        units
                    })}
                >
                    Pick Center on Map
                </button>
            </div>
        </div>
    );
}

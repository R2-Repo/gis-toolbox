import { useState } from 'react';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function LineSliceAlongDialog({ onCancel, onSlice }) {
    const [start, setStart] = useState('0');
    const [stop, setStop] = useState('100');
    const [units, setUnits] = useState('feet');

    return (
        <div>
            <p>Extract a section of a line between two distances measured from the start.</p>
            <div className="form-group">
                <label>Start distance</label>
                <input
                    type="number"
                    value={start}
                    min="0"
                    step="1"
                    onChange={(e) => setStart(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Stop distance</label>
                <input
                    type="number"
                    value={stop}
                    min="0"
                    step="1"
                    onChange={(e) => setStop(e.target.value)}
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
                    onClick={() => onSlice?.({
                        start: parseFloat(start),
                        stop: parseFloat(stop),
                        units
                    })}
                >
                    Slice
                </button>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function AlongToolDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onPick
}) {
    const [distance, setDistance] = useState('100');
    const [units, setUnits] = useState('feet');
    const [applyTo, setApplyTo] = useState(selectionCount > 0 ? 'selection' : 'layer');

    return (
        <div>
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <p>Get a point at a specified distance along a line feature.</p>
            <div className="form-group">
                <label>Distance along line</label>
                <input
                    type="number"
                    value={distance}
                    min="0"
                    step="1"
                    onChange={(e) => setDistance(e.target.value)}
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
            <div className="info-box text-xs">Uses the first LineString in the layer or selection.</div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onPick?.({ dist: parseFloat(distance), units, applyTo })}
                >
                    Find Point
                </button>
            </div>
        </div>
    );
}

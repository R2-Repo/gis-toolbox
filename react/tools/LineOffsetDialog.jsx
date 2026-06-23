import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function LineOffsetDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onApply
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
            <div className="form-group">
                <label>Offset distance</label>
                <input
                    type="number"
                    value={distance}
                    min="0.001"
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
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onApply?.({ dist: parseFloat(distance), units, applyTo })}
                >
                    Offset
                </button>
            </div>
        </div>
    );
}

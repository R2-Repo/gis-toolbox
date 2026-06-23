import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

export function SimplifyToolDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onApply
}) {
    const [tolerance, setTolerance] = useState('0.001');
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
                <label>Tolerance (degrees, e.g., 0.001)</label>
                <input
                    type="number"
                    value={tolerance}
                    min="0.00001"
                    step="0.0001"
                    onChange={(e) => setTolerance(e.target.value)}
                />
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onApply?.({ tol: parseFloat(tolerance), applyTo })}
                >
                    Simplify
                </button>
            </div>
        </div>
    );
}

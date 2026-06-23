import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

export function PolygonSmoothDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onApply
}) {
    const [iterations, setIterations] = useState('1');
    const [applyTo, setApplyTo] = useState(selectionCount > 0 ? 'selection' : 'layer');

    return (
        <div>
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <p>Smooth jagged polygon edges by averaging corner positions.</p>
            <div className="form-group">
                <label>Iterations (higher = smoother, default 1)</label>
                <input
                    type="number"
                    value={iterations}
                    min="1"
                    max="10"
                    step="1"
                    onChange={(e) => setIterations(e.target.value)}
                />
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onApply?.({ iter: parseInt(iterations, 10), applyTo })}
                >
                    Smooth
                </button>
            </div>
        </div>
    );
}

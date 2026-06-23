import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

export function BezierSplineDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onApply
}) {
    const [resolution, setResolution] = useState('10000');
    const [sharpness, setSharpness] = useState('0.85');
    const [applyTo, setApplyTo] = useState(selectionCount > 0 ? 'selection' : 'layer');

    return (
        <div>
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <p>Smooth line features into curved bezier splines.</p>
            <div className="form-group">
                <label>Resolution (higher = smoother, default 10000)</label>
                <input
                    type="number"
                    value={resolution}
                    min="100"
                    step="500"
                    onChange={(e) => setResolution(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Sharpness (0-1, higher = sharper curves)</label>
                <input
                    type="number"
                    value={sharpness}
                    min="0"
                    max="1"
                    step="0.05"
                    onChange={(e) => setSharpness(e.target.value)}
                />
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onApply?.({
                        res: parseInt(resolution, 10),
                        sharp: parseFloat(sharpness),
                        applyTo
                    })}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

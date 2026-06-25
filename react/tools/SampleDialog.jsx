import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

export function SampleDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onApply
}) {
    const [applyTo, setApplyTo] = useState(selectionCount > 0 ? 'selection' : 'layer');
    const [num, setNum] = useState('10');

    const parsedNum = parseInt(num, 10);
    const canApply = isApplyToValid(applyTo, selectionCount) && Number.isFinite(parsedNum) && parsedNum > 0;

    return (
        <div>
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <div className="form-group">
                <label>Number of features</label>
                <input
                    type="number"
                    value={num}
                    min="1"
                    step="1"
                    onChange={(e) => setNum(e.target.value)}
                />
            </div>
            <p>Randomly pick features from the layer. If the count exceeds available features, all are returned.</p>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!canApply}
                    onClick={() => onApply?.({ num: parsedNum, applyTo })}
                >
                    Sample
                </button>
            </div>
        </div>
    );
}

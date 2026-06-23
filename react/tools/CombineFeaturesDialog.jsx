import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

export function CombineFeaturesDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onCombine
}) {
    const [applyTo, setApplyTo] = useState(selectionCount > 0 ? 'selection' : 'layer');

    return (
        <div>
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <p>Merge features of the same geometry type into Multi-geometry features.</p>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onCombine?.({ applyTo })}
                >
                    Combine
                </button>
            </div>
        </div>
    );
}

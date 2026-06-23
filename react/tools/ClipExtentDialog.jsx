import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

export function ClipExtentDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onApply
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
            <p>This will clip features to the current visible map area.</p>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onApply?.({ applyTo })}
                >
                    Clip
                </button>
            </div>
        </div>
    );
}

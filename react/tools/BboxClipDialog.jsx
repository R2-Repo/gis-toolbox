import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

export function BboxClipDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onDraw
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
            <p>Draw a rectangle on the map to clip features to that area.</p>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onDraw?.({ applyTo })}
                >
                    Draw Rectangle on Map
                </button>
            </div>
        </div>
    );
}

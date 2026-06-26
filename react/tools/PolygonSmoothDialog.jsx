import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

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
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onApply?.({ iter: parseInt(iterations, 10), applyTo })}
            runLabel="Smooth"
            disabled={!isApplyToValid(applyTo, selectionCount)}
        >
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <div className="form-group">
                <label>Iterations</label>
                <input
                    type="number"
                    value={iterations}
                    min="1"
                    max="10"
                    step="1"
                    onChange={(e) => setIterations(e.target.value)}
                />
            </div>
        </WidgetPanelShell>
    );
}

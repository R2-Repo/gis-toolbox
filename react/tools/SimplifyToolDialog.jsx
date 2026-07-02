import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

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
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onApply?.({ tol: parseFloat(tolerance), applyTo })}
            runLabel="Simplify"
            disabled={!isApplyToValid(applyTo, selectionCount)}
        >
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <div className="form-group">
                <label>Tolerance (degrees)</label>
                <input
                    type="number"
                    value={tolerance}
                    min="0.00001"
                    step="0.0001"
                    onChange={(e) => setTolerance(e.target.value)}
                />
            </div>
        </WidgetPanelShell>
    );
}

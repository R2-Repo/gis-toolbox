import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

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
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onApply?.({
                res: parseInt(resolution, 10),
                sharp: parseFloat(sharpness),
                applyTo
            })}
            runLabel="Apply"
            disabled={!isApplyToValid(applyTo, selectionCount)}
        >
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <div className="form-group">
                <label>Resolution</label>
                <input
                    type="number"
                    value={resolution}
                    min="100"
                    step="500"
                    onChange={(e) => setResolution(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Sharpness (0–1)</label>
                <input
                    type="number"
                    value={sharpness}
                    min="0"
                    max="1"
                    step="0.05"
                    onChange={(e) => setSharpness(e.target.value)}
                />
            </div>
        </WidgetPanelShell>
    );
}

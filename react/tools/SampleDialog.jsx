import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

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
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onApply?.({ num: parsedNum, applyTo })}
            runLabel="Sample"
            disabled={!canApply}
        >
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
        </WidgetPanelShell>
    );
}

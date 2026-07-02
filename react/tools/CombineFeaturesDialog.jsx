import { useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function CombineFeaturesDialog({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onCombine
}) {
    const [applyTo, setApplyTo] = useState(selectionCount > 0 ? 'selection' : 'layer');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onCombine?.({ applyTo })}
            runLabel="Combine"
            disabled={!isApplyToValid(applyTo, selectionCount)}
        >
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
        </WidgetPanelShell>
    );
}

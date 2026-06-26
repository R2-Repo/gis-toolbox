import { useMemo, useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function DissolveDialog({
    fields = [],
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    onCancel,
    onDissolve
}) {
    const options = useMemo(() => fields.filter((field) => field && field.name), [fields]);
    const [field, setField] = useState('');
    const [applyTo, setApplyTo] = useState(selectionCount > 0 ? 'selection' : 'layer');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onDissolve?.({ field, applyTo })}
            runLabel="Dissolve"
            disabled={!isApplyToValid(applyTo, selectionCount)}
        >
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <div className="form-group">
                <label>Dissolve field</label>
                <select value={field} onChange={(e) => setField(e.target.value)}>
                    <option value="">— Merge all polygons —</option>
                    {options.map((opt) => (
                        <option key={opt.name} value={opt.name}>
                            {opt.name}
                        </option>
                    ))}
                </select>
            </div>
        </WidgetPanelShell>
    );
}

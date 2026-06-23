import { useMemo, useState } from 'react';
import { ApplyToSelector, isApplyToValid } from './ApplyToSelector.jsx';

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
        <div>
            <ApplyToSelector
                selectionCount={selectionCount}
                totalCount={totalCount}
                layerName={layerName}
                onChange={setApplyTo}
            />
            <p>Merge polygons that share the same field value, or merge everything into one polygon.</p>
            <div className="form-group">
                <label>Dissolve field</label>
                <select value={field} onChange={(e) => setField(e.target.value)}>
                    <option value="">— Merge all polygons (no grouping field) —</option>
                    {options.map((opt) => (
                        <option key={opt.name} value={opt.name}>
                            {opt.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    disabled={!isApplyToValid(applyTo, selectionCount)}
                    onClick={() => onDissolve?.({ field, applyTo })}
                >
                    Dissolve
                </button>
            </div>
        </div>
    );
}

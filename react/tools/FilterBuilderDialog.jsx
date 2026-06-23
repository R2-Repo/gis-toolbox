import { useState } from 'react';

function emptyRule() {
    return { field: '', operator: 'equals', value: '' };
}

export function FilterBuilderDialog({
    fields = [],
    operators = [],
    existing = null,
    onCancel,
    onApply,
    onRemoveFilter
}) {
    const [rules, setRules] = useState(() => {
        if (existing?.rules?.length) {
            return existing.rules.map((r) => ({ ...r }));
        }
        return [emptyRule()];
    });
    const [logic, setLogic] = useState(existing?.logic || 'AND');

    const updateRule = (index, patch) => {
        setRules((current) => current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
    };

    const addRule = () => setRules((current) => [...current, emptyRule()]);

    const removeRule = (index) => {
        setRules((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
    };

    return (
        <div>
            {rules.map((rule, index) => (
                <div key={index} className="flex gap-4 items-center mb-8">
                    <select
                        className="rule-field"
                        style={{ flex: 1 }}
                        value={rule.field || fields[0] || ''}
                        onChange={(e) => updateRule(index, { field: e.target.value })}
                    >
                        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                        className="rule-op"
                        style={{ flex: 1 }}
                        value={rule.operator}
                        onChange={(e) => updateRule(index, { operator: e.target.value })}
                    >
                        {operators.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        className="rule-val"
                        placeholder="value"
                        style={{ flex: 1 }}
                        value={rule.value ?? ''}
                        onChange={(e) => updateRule(index, { value: e.target.value })}
                    />
                    <button type="button" className="btn-icon" onClick={() => removeRule(index)}>✕</button>
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-secondary mt-8" onClick={addRule}>+ Add Rule</button>
            <div className="form-group mt-8">
                <label>Logic</label>
                <select value={logic} onChange={(e) => setLogic(e.target.value)}>
                    <option value="AND">AND (all match)</option>
                    <option value="OR">OR (any match)</option>
                </select>
            </div>
            <div className="modal-footer">
                {existing ? (
                    <button type="button" className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => onRemoveFilter?.()}>
                        Remove Filter
                    </button>
                ) : null}
                <button type="button" className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary apply-btn"
                    onClick={() => onApply?.({ rules, logic })}
                >
                    Apply Filter
                </button>
            </div>
        </div>
    );
}

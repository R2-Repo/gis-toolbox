import { useState } from 'react';

function emptyRule(fields) {
    return { field: fields[0] || '', type: 'required', extra: '' };
}

export function ValidationDialog({ fields = [], onCancel, onApply }) {
    const [rules, setRules] = useState(() => [emptyRule(fields)]);

    const updateRule = (index, patch) => {
        setRules((current) => current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
    };

    const addRule = () => setRules((current) => [...current, emptyRule(fields)]);
    const removeRule = (index) => {
        setRules((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
    };

    return (
        <div>
            {rules.map((rule, index) => (
                <div key={index} className="flex gap-4 items-center mb-8">
                    <select
                        className="val-field"
                        style={{ flex: 1 }}
                        value={rule.field}
                        onChange={(e) => updateRule(index, { field: e.target.value })}
                    >
                        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                        className="val-type"
                        style={{ flex: 1 }}
                        value={rule.type}
                        onChange={(e) => updateRule(index, { type: e.target.value })}
                    >
                        <option value="required">Required</option>
                        <option value="numeric_range">Numeric Range</option>
                        <option value="allowed_values">Allowed Values</option>
                    </select>
                    <input
                        type="text"
                        className="val-extra"
                        placeholder="min,max or val1,val2"
                        style={{ flex: 1 }}
                        value={rule.extra}
                        onChange={(e) => updateRule(index, { extra: e.target.value })}
                    />
                    <button type="button" className="btn-icon" onClick={() => removeRule(index)}>✕</button>
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-secondary mt-8" onClick={addRule}>+ Add Rule</button>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary apply-btn"
                    onClick={() => {
                        const parsed = rules.map((rule) => {
                            const out = { field: rule.field, type: rule.type };
                            const extra = rule.extra;
                            if (rule.type === 'numeric_range' && extra) {
                                const parts = extra.split(',');
                                out.min = parseFloat(parts[0]) || null;
                                out.max = parseFloat(parts[1]) || null;
                            }
                            if (rule.type === 'allowed_values' && extra) {
                                out.values = extra.split(',').map((s) => s.trim());
                            }
                            return out;
                        });
                        onApply?.(parsed);
                    }}
                >
                    Run Validation
                </button>
            </div>
        </div>
    );
}

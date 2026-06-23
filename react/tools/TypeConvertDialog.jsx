import { useState } from 'react';

const TYPE_OPTIONS = [
    { value: 'number', label: 'Number' },
    { value: 'string', label: 'String' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date (ISO)' }
];

export function TypeConvertDialog({ fields = [], onCancel, onApply }) {
    const [field, setField] = useState(fields[0] || '');
    const [type, setType] = useState('number');

    return (
        <div>
            <div className="form-group">
                <label>Field</label>
                <select value={field} onChange={(e) => setField(e.target.value)}>
                    {fields.map((name) => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Convert to</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button className="btn btn-primary apply-btn" onClick={() => onApply?.({ field, type })}>Apply</button>
            </div>
        </div>
    );
}

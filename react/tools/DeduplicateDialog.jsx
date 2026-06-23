import { useState } from 'react';

export function DeduplicateDialog({ fields = [], onCancel, onApply }) {
    const [selectedFields, setSelectedFields] = useState(() => new Set());
    const [keep, setKeep] = useState('first');

    const toggleField = (field) => {
        setSelectedFields((current) => {
            const next = new Set(current);
            if (next.has(field)) {
                next.delete(field);
            } else {
                next.add(field);
            }
            return next;
        });
    };

    return (
        <div>
            <div className="form-group">
                <label>Key fields for dedup</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {fields.map((field) => (
                        <label key={field} className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={selectedFields.has(field)}
                                onChange={() => toggleField(field)}
                            /> {field}
                        </label>
                    ))}
                </div>
            </div>
            <div className="form-group">
                <label>Keep strategy</label>
                <select value={keep} onChange={(e) => setKeep(e.target.value)}>
                    <option value="first">Keep first</option>
                    <option value="last">Keep last</option>
                </select>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onApply?.({ keyFields: Array.from(selectedFields), keep })}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

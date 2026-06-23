import { useMemo, useState } from 'react';

export function CombineColumnsDialog({ fields = [], onCancel, onApply }) {
    const [selectedFields, setSelectedFields] = useState(() => new Set());
    const [delimiter, setDelimiter] = useState(' ');
    const [outputField, setOutputField] = useState('combined');
    const [skipBlanks, setSkipBlanks] = useState(true);

    const selectedCount = useMemo(() => selectedFields.size, [selectedFields]);

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
                <label>Select fields to combine</label>
                <div id="cc-fields-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
                <label>Delimiter</label>
                <input type="text" value={delimiter} onChange={(e) => setDelimiter(e.target.value)} />
            </div>
            <div className="form-group">
                <label>Output field name</label>
                <input type="text" value={outputField} onChange={(e) => setOutputField(e.target.value)} />
            </div>
            <label className="checkbox-row">
                <input
                    type="checkbox"
                    checked={skipBlanks}
                    onChange={(e) => setSkipBlanks(e.target.checked)}
                /> Skip empty values
            </label>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onApply?.({
                        selectedFields: Array.from(selectedFields),
                        delimiter,
                        outputField,
                        skipBlanks
                    })}
                    disabled={selectedCount === 0}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

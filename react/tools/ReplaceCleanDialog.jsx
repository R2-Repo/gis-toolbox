import { useState } from 'react';

const CASE_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'upper', label: 'UPPER' },
    { value: 'lower', label: 'lower' },
    { value: 'title', label: 'Title Case' }
];

export function ReplaceCleanDialog({ fields = [], onCancel, onApply }) {
    const [field, setField] = useState(fields[0] || '');
    const [find, setFind] = useState('');
    const [replace, setReplace] = useState('');
    const [trimWhitespace, setTrimWhitespace] = useState(false);
    const [collapseSpaces, setCollapseSpaces] = useState(false);
    const [caseTransform, setCaseTransform] = useState('');

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
                <label>Find</label>
                <input type="text" value={find} onChange={(e) => setFind(e.target.value)} />
            </div>
            <div className="form-group">
                <label>Replace with</label>
                <input type="text" value={replace} onChange={(e) => setReplace(e.target.value)} />
            </div>
            <label className="checkbox-row">
                <input
                    type="checkbox"
                    checked={trimWhitespace}
                    onChange={(e) => setTrimWhitespace(e.target.checked)}
                /> Trim whitespace
            </label>
            <label className="checkbox-row">
                <input
                    type="checkbox"
                    checked={collapseSpaces}
                    onChange={(e) => setCollapseSpaces(e.target.checked)}
                /> Collapse multiple spaces
            </label>
            <div className="form-group">
                <label>Case transform</label>
                <select value={caseTransform} onChange={(e) => setCaseTransform(e.target.value)}>
                    {CASE_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onApply?.({
                        field,
                        find,
                        replace,
                        trimWhitespace,
                        collapseSpaces,
                        caseTransform
                    })}
                    disabled={!field}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

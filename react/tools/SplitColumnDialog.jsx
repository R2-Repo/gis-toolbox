import { useState } from 'react';

const DELIMITER_OPTIONS = [
    { value: ',', label: 'Comma' },
    { value: ' ', label: 'Space' },
    { value: '\t', label: 'Tab' },
    { value: ';', label: 'Semicolon' },
    { value: 'custom', label: 'Custom' }
];

export function SplitColumnDialog({ fields = [], onCancel, onApply }) {
    const [field, setField] = useState(fields[0] || '');
    const [delimiter, setDelimiter] = useState(',');
    const [customDelimiter, setCustomDelimiter] = useState('');
    const [maxParts, setMaxParts] = useState('0');
    const [trim, setTrim] = useState(true);

    return (
        <div>
            <div className="form-group">
                <label>Field to split</label>
                <select value={field} onChange={(e) => setField(e.target.value)}>
                    {fields.map((name) => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Delimiter</label>
                <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                    {DELIMITER_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            {delimiter === 'custom' ? (
                <div className="form-group">
                    <label>Custom delimiter</label>
                    <input type="text" value={customDelimiter} onChange={(e) => setCustomDelimiter(e.target.value)} />
                </div>
            ) : null}
            <div className="form-group">
                <label>Max parts (0=all)</label>
                <input
                    type="number"
                    min="0"
                    value={maxParts}
                    onChange={(e) => setMaxParts(e.target.value)}
                />
            </div>
            <label className="checkbox-row">
                <input
                    type="checkbox"
                    checked={trim}
                    onChange={(e) => setTrim(e.target.checked)}
                /> Trim whitespace
            </label>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onApply?.({
                        field,
                        delimiter,
                        customDelimiter,
                        trim,
                        maxParts
                    })}
                    disabled={!field}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { FieldSelect } from '../widgets/shared/FieldSelect.jsx';

export function JoinToolDialog({ fields = [], onCancel, onApply, onFileLoad }) {
    const [leftKey, setLeftKey] = useState(fields[0] || '');
    const [rightKey, setRightKey] = useState('');
    const [joinFields, setJoinFields] = useState([]);
    const [selectedFields, setSelectedFields] = useState(new Set());
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const result = await onFileLoad?.(file);
            if (!result) return;
            const keys = result.joinFields || [];
            setJoinFields(keys);
            setRightKey(keys[0] || '');
            setSelectedFields(new Set(keys));
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    const toggleField = (field) => {
        setSelectedFields((current) => {
            const next = new Set(current);
            if (next.has(field)) next.delete(field);
            else next.add(field);
            return next;
        });
    };

    return (
        <div>
            <div className="info-box mb-8">Upload a CSV or Excel file to join with the active layer.</div>
            <div className="form-group">
                <label>Join file</label>
                <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleFileChange} disabled={loading} />
            </div>
            <div className="form-group">
                <label>Active layer key field</label>
                <FieldSelect value={leftKey} onChange={setLeftKey} fields={fields} placeholder="Select field" />
            </div>
            <div className="form-group">
                <label>Join file key field</label>
                <select value={rightKey} disabled={!loaded} onChange={(e) => setRightKey(e.target.value)}>
                    {!loaded ? <option>Load file first</option> : null}
                    {joinFields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Fields to bring over</label>
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {!loaded ? 'Load file first' : joinFields.map((f) => (
                        <label key={f} className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={selectedFields.has(f)}
                                onChange={() => toggleField(f)}
                            /> {f}
                        </label>
                    ))}
                </div>
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary apply-btn"
                    disabled={!loaded}
                    onClick={() => onApply?.({
                        leftKey,
                        rightKey,
                        fieldsToJoin: Array.from(selectedFields)
                    })}
                >
                    Join
                </button>
            </div>
        </div>
    );
}

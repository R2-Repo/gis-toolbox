import { useMemo, useState } from 'react';
import { FieldSelect } from '../widgets/shared/FieldSelect.jsx';
import { previewTemplate } from '../../js/dataprep/template-builder.js';

export function TemplateBuilderDialog({
    fields = [],
    features = [],
    onCancel,
    onApply
}) {
    const [outputField, setOutputField] = useState('template_result');
    const [template, setTemplate] = useState('');
    const [insertField, setInsertField] = useState(fields[0] || '');
    const [trimWhitespace, setTrimWhitespace] = useState(true);
    const [collapseSpaces, setCollapseSpaces] = useState(true);
    const [removeEmptyWrappers, setRemoveEmptyWrappers] = useState(true);
    const [removeDanglingSeparators, setRemoveDanglingSeparators] = useState(true);
    const [collapseSeparators, setCollapseSeparators] = useState(true);

    const opts = useMemo(() => ({
        trimWhitespace,
        collapseSpaces,
        removeEmptyWrappers,
        removeDanglingSeparators,
        collapseSeparators
    }), [trimWhitespace, collapseSpaces, removeEmptyWrappers, removeDanglingSeparators, collapseSeparators]);

    const previewResults = useMemo(() => {
        if (!template) return [];
        return previewTemplate(features, template, opts);
    }, [features, template, opts]);

    const insertFieldToken = () => {
        if (!insertField) return;
        setTemplate((current) => `${current}{${insertField}}`);
    };

    return (
        <div>
            <div className="form-group">
                <label>Output field name</label>
                <input type="text" value={outputField} onChange={(e) => setOutputField(e.target.value)} />
            </div>
            <div className="form-group">
                <label>Template (use {'{FieldName}'} for placeholders)</label>
                <textarea
                    rows={3}
                    placeholder="e.g. {Name} - {City}, {State}"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Insert field</label>
                <div className="input-with-btn">
                    <FieldSelect value={insertField} onChange={setInsertField} fields={fields} placeholder="Select field" />
                    <button type="button" className="btn btn-sm btn-secondary" onClick={insertFieldToken}>Insert</button>
                </div>
            </div>
            <label className="checkbox-row">
                <input type="checkbox" checked={trimWhitespace} onChange={(e) => setTrimWhitespace(e.target.checked)} /> Trim whitespace
            </label>
            <label className="checkbox-row">
                <input type="checkbox" checked={collapseSpaces} onChange={(e) => setCollapseSpaces(e.target.checked)} /> Collapse spaces
            </label>
            <label className="checkbox-row">
                <input type="checkbox" checked={removeEmptyWrappers} onChange={(e) => setRemoveEmptyWrappers(e.target.checked)} /> Remove empty wrappers ()/[]/{'{}'}
            </label>
            <label className="checkbox-row">
                <input type="checkbox" checked={removeDanglingSeparators} onChange={(e) => setRemoveDanglingSeparators(e.target.checked)} /> Remove dangling separators
            </label>
            <label className="checkbox-row">
                <input type="checkbox" checked={collapseSeparators} onChange={(e) => setCollapseSeparators(e.target.checked)} /> Collapse repeated separators
            </label>
            <div className="divider" />
            <div><strong>Live Preview:</strong></div>
            <div
                className="text-sm text-mono"
                style={{ background: 'var(--bg)', padding: 8, borderRadius: 4, maxHeight: 120, overflowY: 'auto', marginTop: 6 }}
            >
                {!template ? '(enter a template above)' : previewResults.map((r, i) => (
                    <div key={i}>{i + 1}: {r || <em>empty</em>}</div>
                ))}
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary apply-btn"
                    onClick={() => onApply?.({ template, outputField, ...opts })}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

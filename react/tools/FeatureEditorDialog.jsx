import { useRef, useState } from 'react';

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FieldRow({ field, fieldType, initialValue, onTextChange, onAttachmentChange, onError }) {
    const fileRef = useRef(null);
    const isAtt = fieldType === 'attachment' || (initialValue && typeof initialValue === 'object' && initialValue._att);
    const att = isAtt && initialValue?._att ? initialValue : null;
    const [preview, setPreview] = useState(att);

    if (isAtt) {
        const isImage = preview?.type?.startsWith('image/');
        return (
            <div className="form-group" style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {field} <span style={{ opacity: 0.6, fontSize: 9 }}>(photo)</span>
                </label>
                {preview ? (
                    <div className="att-preview-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        {isImage && preview.dataUrl ? (
                            <img src={preview.dataUrl} alt="" style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, border: '1px solid var(--border)' }} />
                        ) : <span style={{ fontSize: 20 }}>📎</span>}
                        <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={preview.name}>{preview.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatFileSize(preview.size)}</span>
                        <button
                            type="button"
                            className="att-remove-btn btn btn-sm"
                            style={{ fontSize: 10, padding: '2px 6px', color: 'var(--error)' }}
                            title="Remove"
                            onClick={() => {
                                setPreview(null);
                                onAttachmentChange(field, null);
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ) : null}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    📷 {preview ? 'Replace Photo' : 'Choose Photo'}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                                onError?.('Only image files are supported');
                                e.target.value = '';
                                return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                                onError?.('Photo too large — max 10 MB');
                                e.target.value = '';
                                return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                                const attObj = { _att: true, name: file.name, dataUrl: reader.result, type: file.type, size: file.size };
                                setPreview(attObj);
                                onAttachmentChange(field, attObj);
                            };
                            reader.readAsDataURL(file);
                        }}
                    />
                </label>
                <span className="att-size-note" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>Max 10 MB · KML/KMZ only</span>
            </div>
        );
    }

    let displayVal = initialValue;
    if (displayVal != null && typeof displayVal === 'object') displayVal = JSON.stringify(displayVal);

    return (
        <div className="form-group" style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>{field}</label>
            <input
                type="text"
                className="feat-edit-input"
                defaultValue={displayVal != null ? String(displayVal) : ''}
                style={{ width: '100%', fontSize: 13 }}
                onChange={(e) => onTextChange(field, e.target.value)}
            />
        </div>
    );
}

export function FeatureEditorDialog({
    layerName,
    featureIndex,
    geomType,
    fields = [],
    getFieldType,
    getFieldValue,
    onCancel,
    onSave,
    onError
}) {
    const textValuesRef = useRef(new Map());
    const attachmentUpdatesRef = useRef(new Map());

    const handleTextChange = (field, value) => {
        textValuesRef.current.set(field, value);
    };

    const handleAttachmentChange = (field, data) => {
        attachmentUpdatesRef.current.set(field, data);
    };

    return (
        <div>
            <div className="text-xs text-muted mb-8" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 8 }}>
                <strong>{layerName}</strong> · Feature #{featureIndex + 1} · {geomType}
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {fields.map((field) => (
                    <FieldRow
                        key={field}
                        field={field}
                        fieldType={getFieldType?.(field)}
                        initialValue={getFieldValue?.(field)}
                        onTextChange={handleTextChange}
                        onAttachmentChange={handleAttachmentChange}
                        onError={onError}
                    />
                ))}
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary apply-btn"
                    onClick={() => onSave?.({
                        textValues: Object.fromEntries(textValuesRef.current),
                        attachmentUpdates: Object.fromEntries(attachmentUpdatesRef.current)
                    })}
                >
                    Save
                </button>
            </div>
        </div>
    );
}

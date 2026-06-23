import React from 'react';

export function InspectorLabel({ children, style }) {
    return <label className="wf-inspector-label" style={style}>{children}</label>;
}

export const InspectorInput = React.forwardRef(function InspectorInput(
    { value, onChange, type = 'text', ...rest },
    ref
) {
    return (
        <input
            ref={ref}
            className="wf-inspector-input"
            type={type}
            value={value ?? ''}
            onChange={(e) => onChange?.(type === 'number' ? e.target.value : e.target.value)}
            {...rest}
        />
    );
});

export function InspectorSelect({ value, onChange, children, ...rest }) {
    return (
        <select
            className="wf-inspector-select"
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            {...rest}
        >
            {children}
        </select>
    );
}

export const InspectorTextarea = React.forwardRef(function InspectorTextarea(
    { value, onChange, rows = 3, ...rest },
    ref
) {
    return (
        <textarea
            ref={ref}
            className="wf-inspector-input"
            rows={rows}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
            {...rest}
        />
    );
});

export function ToggleRow({ options, value, onChange }) {
    return (
        <div className="wf-toggle-row">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className={`wf-toggle-btn${value === opt.value ? ' active' : ''}`}
                    onClick={() => onChange?.(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export function FieldCheckboxList({ fields, selected, onChange, emptyText = 'No fields available' }) {
    if (!fields.length) {
        return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emptyText}</p>;
    }
    return (
        <div className="wf-check-list">
            {fields.map((field) => (
                <label key={field} className="wf-check-row">
                    <input
                        type="checkbox"
                        checked={selected.includes(field)}
                        onChange={(e) => {
                            if (e.target.checked) onChange([...selected, field]);
                            else onChange(selected.filter((f) => f !== field));
                        }}
                    />
                    <span>{field}</span>
                </label>
            ))}
        </div>
    );
}

export function FieldChips({ fields, onInsert, format = (f) => `{${f}}` }) {
    if (!fields.length) {
        return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No fields available</span>;
    }
    return (
        <div className="wf-field-chips">
            {fields.map((field) => (
                <span
                    key={field}
                    className="wf-field-chip"
                    title="Click to insert"
                    onClick={() => onInsert(format(field))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onInsert(format(field)); }}
                >
                    {format(field)}
                </span>
            ))}
        </div>
    );
}

export function MixedGeometryWarning() {
    return (
        <div
            style={{
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(234,179,8,0.12)',
                border: '1px solid rgba(234,179,8,0.3)',
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--text)'
            }}
        >
            <strong style={{ color: '#eab308' }}>⚠️ Mixed Geometry</strong>
            <br />
            This layer contains multiple geometry types (points, lines, and/or polygons).
            Some spatial nodes expect a single geometry type and may skip or error on
            mismatched features.
            <br />
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                Tip: Use a <strong>Split By Geometry</strong> node after this input
                to separate features by type before further analysis.
            </span>
        </div>
    );
}

export function InfoText({ children }) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{children}</p>;
}

export function HintText({ children }) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{children}</p>;
}

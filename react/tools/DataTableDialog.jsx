import { useEffect, useRef } from 'react';

function formatCell(val) {
    if (val && typeof val === 'object' && val._att) {
        const icon = val.type?.startsWith('image/') ? '🖼️' : '📎';
        return `${icon} ${val.name || 'attachment'}`;
    }
    if (val != null && typeof val === 'object') return JSON.stringify(val);
    return val ?? '';
}

function isAttachment(val) {
    return val && typeof val === 'object' && val._att;
}

export function DataTableDialog({
    layerName,
    fields = [],
    rows = [],
    totalCount = 0,
    isSpatial = true,
    onCellEdit,
    onClose
}) {
    const dirtyRef = useRef(false);

    useEffect(() => {
        return () => {
            if (dirtyRef.current) onClose?.({ dirty: true });
            else onClose?.({ dirty: false });
        };
    }, [onClose]);

    const handleBlur = (rowIndex, field, newVal, oldVal) => {
        const coerced = (oldVal === null || oldVal === undefined) ? newVal
            : typeof oldVal === 'number' ? (Number.isNaN(Number(newVal)) ? newVal : Number(newVal))
                : typeof oldVal === 'boolean' ? (newVal === 'true')
                    : newVal;
        if (String(oldVal) !== String(coerced)) {
            const isFirstEdit = !dirtyRef.current;
            dirtyRef.current = true;
            onCellEdit?.(rowIndex, field, coerced, isFirstEdit);
        }
    };

    return (
        <div>
            <div className="text-xs text-muted mb-8">
                Showing {rows.length} of {totalCount} rows · <strong>Click a cell to edit</strong>.
                Changes are saved when you click away.
            </div>
            <div className="data-table-wrap" style={{ maxHeight: 450 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}>#</th>
                            {fields.map((f) => <th key={f}>{f}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                <td style={{ color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>{rowIndex + 1}</td>
                                {fields.map((field) => {
                                    const val = row[field];
                                    if (isAttachment(val)) {
                                        return (
                                            <td
                                                key={field}
                                                className="att-cell"
                                                style={{ cursor: 'default', color: 'var(--text-muted)', fontStyle: 'italic' }}
                                                title={val.name || 'attachment'}
                                            >
                                                {formatCell(val)}
                                            </td>
                                        );
                                    }
                                    return (
                                        <td
                                            key={field}
                                            contentEditable
                                            suppressContentEditableWarning
                                            onFocus={(e) => {
                                                e.currentTarget.style.outline = '2px solid var(--primary)';
                                                e.currentTarget.style.background = 'var(--bg-surface)';
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.outline = '';
                                                e.currentTarget.style.background = '';
                                                handleBlur(rowIndex, field, e.currentTarget.textContent, val);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                                                if (e.key === 'Escape') e.currentTarget.blur();
                                                if (e.key === 'Tab') {
                                                    e.preventDefault();
                                                    const next = e.shiftKey
                                                        ? e.currentTarget.previousElementSibling
                                                        : e.currentTarget.nextElementSibling;
                                                    if (next?.contentEditable === 'true') next.focus();
                                                }
                                            }}
                                        >
                                            {formatCell(val)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

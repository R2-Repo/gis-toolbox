import React, { useCallback, useImperativeHandle, useMemo, useState, forwardRef } from 'react';

function getRows(data, sortField, sortDir) {
    if (!data) return [];
    let items;
    if (data.type === 'spatial') {
        items = (data.geojson?.features || []).map((f) => ({ ...f.properties }));
    } else {
        items = data.rows || [];
    }

    if (sortField) {
        items = [...items].sort((a, b) => {
            const va = a[sortField];
            const vb = b[sortField];
            const na = parseFloat(va);
            const nb = parseFloat(vb);
            if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
            return sortDir === 'asc'
                ? String(va ?? '').localeCompare(String(vb ?? ''))
                : String(vb ?? '').localeCompare(String(va ?? ''));
        });
    }
    return items;
}

export const DataPreviewPanel = forwardRef(function DataPreviewPanel(_, ref) {
    const [data, setData] = useState(null);
    const [maxRows, setMaxRows] = useState(500);
    const [visible, setVisible] = useState(false);
    const [sortField, setSortField] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    useImperativeHandle(ref, () => ({
        show(nextData, nextMaxRows = 500) {
            setData(nextData);
            setMaxRows(nextMaxRows);
            setVisible(true);
        },
        hide() {
            setVisible(false);
        }
    }), []);

    const rows = useMemo(
        () => getRows(data, sortField, sortDir),
        [data, sortField, sortDir]
    );

    const fields = useMemo(() => {
        if (!data) return [];
        return data.schema?.fields?.map((f) => f.name)
            || (rows.length > 0 ? Object.keys(rows[0]) : []);
    }, [data, rows]);

    const total = data?.type === 'spatial'
        ? (data.geojson?.features?.length || 0)
        : (data?.rows?.length || 0);

    const display = rows.slice(0, maxRows);

    const onSort = useCallback((field) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    }, [sortField]);

    return (
        <div className={`wf-preview${visible ? ' visible' : ''}`}>
            <div className="wf-preview-bar">
                <span className="wf-preview-title">Data Preview</span>
                <span className="wf-preview-stats">
                    {data ? `${Math.min(total, maxRows)} of ${total} rows • ${fields.length} fields` : ''}
                </span>
                <button
                    type="button"
                    className="wf-btn-icon"
                    title="Close preview"
                    onClick={() => setVisible(false)}
                >
                    ✕
                </button>
            </div>
            <div className="wf-preview-table-wrap">
                <table className="wf-preview-table">
                    <thead>
                        <tr>
                            {fields.map((field) => (
                                <th
                                    key={field}
                                    data-field={field}
                                    onClick={() => onSort(field)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {field}
                                    {sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {display.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {fields.map((field) => {
                                    const val = row[field];
                                    const displayVal = val == null ? '' : String(val);
                                    const truncated = displayVal.length > 80
                                        ? `${displayVal.slice(0, 80)}…`
                                        : displayVal;
                                    return (
                                        <td key={field} title={displayVal}>
                                            {truncated}
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
});

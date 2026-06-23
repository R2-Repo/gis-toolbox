import { useMemo, useState } from 'react';

/**
 * Checkbox list for pre-import attribute selection.
 * @param {{ fields: string[], selected: string[], onChange: (names: string[]) => void, hint?: string }} props
 */
export function ImportFieldSelector({ fields = [], selected = [], onChange, hint }) {
    const [query, setQuery] = useState('');
    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return fields;
        return fields.filter((name) => name.toLowerCase().includes(q));
    }, [fields, query]);

    if (!fields.length) {
        return (
            <p className="text-xs text-muted" style={{ margin: '8px 0 0' }}>
                Field names could not be previewed — all attributes will be imported.
            </p>
        );
    }

    const setSelected = (names) => onChange?.([...names]);

    const toggle = (name, checked) => {
        const next = new Set(selectedSet);
        if (checked) next.add(name);
        else next.delete(name);
        setSelected([...next].sort((a, b) => a.localeCompare(b)));
    };

    return (
        <div className="import-field-selector" style={{ marginTop: 8 }}>
            {hint ? (
                <p className="text-xs text-muted mb-4" style={{ margin: '0 0 8px' }}>{hint}</p>
            ) : null}
            <div className="input-with-btn" style={{ marginBottom: 8 }}>
                <input
                    type="search"
                    placeholder="Search fields…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setSelected(fields)}
                >
                    All
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setSelected([])}
                >
                    None
                </button>
            </div>
            <div
                className="field-list-items"
                style={{
                    maxHeight: '28vh',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 8px'
                }}
            >
                {filtered.map((name) => (
                    <label
                        key={name}
                        className="field-item"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}
                    >
                        <input
                            type="checkbox"
                            checked={selectedSet.has(name)}
                            onChange={(e) => toggle(name, e.target.checked)}
                        />
                        <span className="field-name">{name}</span>
                    </label>
                ))}
                {filtered.length === 0 ? (
                    <div className="text-xs text-muted">No fields match your search.</div>
                ) : null}
            </div>
            <div className="text-xs text-muted mt-4">
                {selectedSet.size} of {fields.length} field{fields.length === 1 ? '' : 's'} selected
            </div>
        </div>
    );
}

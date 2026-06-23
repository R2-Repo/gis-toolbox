import { useMemo, useState } from 'react';
import { listPresetCrs } from '../../../js/crs/registry.js';

const RECENTS_KEY = 'gis-toolbox-crs-recents';
const MAX_RECENTS = 6;

function loadRecents() {
    try {
        const raw = localStorage.getItem(RECENTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveRecent(code) {
    if (!code || code === 'UNKNOWN') return;
    const recents = loadRecents().filter((c) => c !== code);
    recents.unshift(code);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

/**
 * Searchable CRS picker backed by bundled EPSG presets.
 */
export function CrsPicker({
    label = 'Coordinate system',
    value = 'EPSG:4326',
    onChange,
    presets,
    allowCustomEpsg = true,
    placeholder = 'Search EPSG or name…'
}) {
    const [query, setQuery] = useState('');
    const allPresets = useMemo(() => presets || listPresetCrs(), [presets]);
    const recents = useMemo(() => loadRecents(), [value]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const recentItems = recents
            .map((code) => allPresets.find((p) => p.code === code))
            .filter(Boolean);
        const base = q
            ? allPresets.filter((p) => {
                const haystack = [
                    p.code,
                    p.label,
                    ...(p.aliases || [])
                ].join(' ').toLowerCase();
                return haystack.includes(q);
            })
            : allPresets;
        const merged = [...recentItems];
        for (const p of base) {
            if (!merged.some((m) => m.code === p.code)) merged.push(p);
        }
        return merged;
    }, [allPresets, query, recents]);

    const handleChange = (code) => {
        saveRecent(code);
        onChange?.(code);
    };

    return (
        <div className="form-group">
            {label ? <label>{label}</label> : null}
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="crs-picker-search"
            />
            <select
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                size={Math.min(8, Math.max(4, filtered.length))}
                className="crs-picker-select"
            >
                {filtered.map((preset) => (
                    <option key={preset.code} value={preset.code}>
                        {preset.label}
                    </option>
                ))}
            </select>
            {allowCustomEpsg ? (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value.trim())}
                    placeholder="EPSG:4326"
                    style={{ marginTop: 6 }}
                />
            ) : null}
        </div>
    );
}

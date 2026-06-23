import { useEffect, useMemo, useState } from 'react';
import { WidgetPanelShell } from './shared/WidgetPanelShell.jsx';

const MAP_TARGET_CRS = 'EPSG:4326';
const MAP_TARGET_LABEL = 'WGS 84 (EPSG:4326)';

export function CrsManagerDialog({
    audit = [],
    onCancel,
    onRegisterWkt,
    onReprojectLayers
}) {
    const [selected, setSelected] = useState(new Set());
    const [customWkt, setCustomWkt] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [status, setStatus] = useState('');
    const [running, setRunning] = useState(false);

    const needsAttention = useMemo(
        () => audit.filter((entry) => !entry.displayReady),
        [audit]
    );

    const mapReadyCount = audit.length - needsAttention.length;

    useEffect(() => {
        setSelected(new Set(needsAttention.map((entry) => entry.id)));
    }, [needsAttention]);

    const toggleLayer = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const runBatch = async () => {
        if (!selected.size) {
            setStatus('Select at least one layer with a CRS badge.');
            return;
        }
        setRunning(true);
        setStatus('');
        try {
            await onReprojectLayers?.([...selected], MAP_TARGET_CRS);
            setStatus('Reproject complete — new map-ready layer(s) added.');
        } catch (err) {
            setStatus(err?.message || 'Reproject failed.');
        } finally {
            setRunning(false);
        }
    };

    const registerWkt = async () => {
        setRunning(true);
        setStatus('');
        try {
            const code = await onRegisterWkt?.(customWkt);
            setStatus(`Registered ${code}`);
            setCustomWkt('');
        } catch (err) {
            setStatus(err?.message || 'Invalid WKT.');
        } finally {
            setRunning(false);
        }
    };

    const statusTone = status.includes('failed')
        || status.includes('Select')
        || status.includes('already map-ready')
        || status.includes('No reprojection')
        ? 'danger'
        : 'muted';

    return (
        <WidgetPanelShell
            status={status}
            statusTone={statusTone}
            onCancel={onCancel}
            onRun={runBatch}
            runLabel="Reproject to WGS 84"
            running={running}
            disabled={running || selected.size === 0 || needsAttention.length === 0}
        >
            <p className="text-sm mb-8">
                Use this when a layer has projected coordinates (UTM, State Plane, etc.) and does not display
                correctly on the map. Reprojecting creates a new copy in {MAP_TARGET_LABEL}.
            </p>

            {needsAttention.length === 0 ? (
                <p className="text-xs text-muted mb-8">
                    All {mapReadyCount} spatial layer{mapReadyCount === 1 ? '' : 's'} already use map-ready coordinates.
                    Nothing to reproject.
                </p>
            ) : (
                <p className="text-xs text-muted mb-4">
                    {needsAttention.length} layer(s) need reprojection. Layers with a <strong>CRS</strong> badge are pre-selected.
                </p>
            )}

            <div className="mb-8">
                <div className="text-xs text-muted mb-4">Layers</div>
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                    {audit.length === 0 ? (
                        <p className="text-xs p-8 text-muted">No spatial layers loaded.</p>
                    ) : audit.map((entry) => (
                        <label
                            key={entry.id}
                            className="text-xs p-4"
                            style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border)',
                                opacity: entry.displayReady ? 0.75 : 1
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selected.has(entry.id)}
                                onChange={() => toggleLayer(entry.id)}
                                disabled={entry.displayReady}
                            />
                            <span style={{ flex: 1 }}>
                                <strong>{entry.name}</strong>
                                {' · '}{entry.crsLabel}
                                {' · '}{entry.featureCount} features
                                {!entry.displayReady ? (
                                    <span className="layer-filter-badge" style={{ marginLeft: 6 }} title={entry.warning}>CRS</span>
                                ) : (
                                    <span className="text-muted" style={{ marginLeft: 6 }}>map-ready</span>
                                )}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <p className="text-xs text-muted">
                Target: {MAP_TARGET_LABEL}. You do not need Favorite CRS codes or WKT for a normal reproject.
            </p>

            <details
                className="mt-8"
                open={showAdvanced}
                onToggle={(e) => setShowAdvanced(e.target.open)}
            >
                <summary className="text-xs text-muted" style={{ cursor: 'pointer' }}>
                    Advanced — register custom WKT
                </summary>
                <div className="form-group mt-4">
                    <p className="text-xs text-muted mb-4">
                        Optional. Paste a .prj WKT definition to register a coordinate system for import/export.
                        Not required for reprojecting layers to the map.
                    </p>
                    <textarea
                        rows={4}
                        value={customWkt}
                        onChange={(e) => setCustomWkt(e.target.value)}
                        placeholder="Paste .prj WKT text…"
                        style={{ width: '100%' }}
                    />
                    <button
                        type="button"
                        className="btn btn-sm btn-secondary mt-4"
                        onClick={registerWkt}
                        disabled={running || !customWkt.trim()}
                    >
                        Register WKT
                    </button>
                </div>
            </details>
        </WidgetPanelShell>
    );
}

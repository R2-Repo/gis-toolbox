import { useEffect, useMemo, useState } from 'react';
import { LayerSelect } from './shared/LayerSelect.jsx';
import { ApplyToSelector } from '../tools/ApplyToSelector.jsx';
import { WidgetPanelShell } from './shared/WidgetPanelShell.jsx';

export function BulkUpdateDialog({
    layers = [],
    onCancel,
    onLayerFocus,
    onSelectAll,
    onInvertSelection,
    onClearSelection,
    onSubscribeSelection,
    onApply
}) {
    const [layerId, setLayerId] = useState('');
    const [updates, setUpdates] = useState([]);
    const [selectionCount, setSelectionCount] = useState(0);
    const [applyTo, setApplyTo] = useState('selection');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [running, setRunning] = useState(false);

    const selectedLayer = useMemo(
        () => layers.find((layer) => layer.id === layerId) || null,
        [layers, layerId]
    );

    useEffect(() => {
        if (!layerId || !onSubscribeSelection) {
            setSelectionCount(0);
            return undefined;
        }
        return onSubscribeSelection(layerId, setSelectionCount);
    }, [layerId, onSubscribeSelection]);

    useEffect(() => {
        if (layerId) onLayerFocus?.(layerId);
    }, [layerId, onLayerFocus]);

    const addUpdateRow = () => {
        if (!selectedLayer?.fields?.length) return;
        setUpdates((current) => [...current, { field: selectedLayer.fields[0], value: '' }]);
    };

    const removeUpdateRow = (idx) => {
        setUpdates((current) => current.filter((_, i) => i !== idx));
    };

    const patchUpdateRow = (idx, patch) => {
        setUpdates((current) => current.map((entry, i) => (
            i === idx ? { ...entry, ...patch } : entry
        )));
    };

    const applyBulkUpdate = async () => {
        setError('');
        setMessage('');
        setRunning(true);
        try {
            const validUpdates = updates.filter((entry) => entry.field);
            if (!layerId) throw new Error('Choose a target layer.');
            if (validUpdates.length === 0) throw new Error('Add at least one field update.');
            if (applyTo === 'selection' && selectionCount === 0) {
                throw new Error('Select features on the map first.');
            }
            const result = await onApply?.({ layerId, updates: validUpdates, applyTo });
            if (!result) return;
            setMessage(
                `Updated ${result.fieldCount} field${result.fieldCount === 1 ? '' : 's'} on ${result.updatedCount} feature${result.updatedCount === 1 ? '' : 's'}.`
            );
        } catch (err) {
            setError(err?.message || 'Bulk update failed.');
        } finally {
            setRunning(false);
        }
    };

    const statusText = error || message || '';
    const canApply = Boolean(
        selectedLayer &&
        updates.length > 0 &&
        (applyTo !== 'selection' || selectionCount > 0)
    );

    return (
        <WidgetPanelShell
            status={statusText}
            statusTone={error ? 'danger' : 'muted'}
            onCancel={onCancel}
            onRun={applyBulkUpdate}
            runLabel="Apply Bulk Update"
            running={running}
            disabled={!canApply || running}
        >
            <LayerSelect
                label="Target layer"
                value={layerId}
                layers={layers}
                onChange={(nextLayerId) => {
                    setLayerId(nextLayerId);
                    setUpdates([]);
                    setError('');
                    setMessage('');
                }}
            />

            {selectedLayer ? (
                <>
                    <ApplyToSelector
                        selectionCount={selectionCount}
                        totalCount={selectedLayer.featureCount}
                        layerName={selectedLayer.name}
                        requireSelection
                        defaultApplyTo="selection"
                        onChange={setApplyTo}
                    />
                    <div className="form-group">
                        <label>Selection shortcuts</label>
                        <div className="gis-widget__btn-row">
                            <button className="btn btn-secondary btn-sm" onClick={() => onSelectAll?.(layerId)}>
                                Select All
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => onInvertSelection?.(layerId)}>
                                Invert
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => onClearSelection?.(layerId)}>
                                Clear
                            </button>
                        </div>
                        <div className="text-xs text-muted">
                            Click or drag on the map to select features while this dialog is open.
                        </div>
                    </div>
                </>
            ) : null}

            {selectedLayer ? (
                <div className="form-group">
                    <label>Field updates</label>
                    {updates.length === 0 ? (
                        <div className="text-xs text-muted mb-8">No fields added yet.</div>
                    ) : null}
                    {updates.map((entry, idx) => (
                        <div key={`update-${idx}`} className="gis-widget__row">
                            <select value={entry.field} onChange={(e) => patchUpdateRow(idx, { field: e.target.value })}>
                                {selectedLayer.fields.map((field) => (
                                    <option key={`${idx}-${field}`} value={field}>{field}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={entry.value}
                                placeholder="new value"
                                onChange={(e) => patchUpdateRow(idx, { value: e.target.value })}
                            />
                            <button className="btn btn-secondary btn-sm" onClick={() => removeUpdateRow(idx)}>Remove</button>
                        </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" onClick={addUpdateRow}>+ Add Field</button>
                </div>
            ) : null}
        </WidgetPanelShell>
    );
}

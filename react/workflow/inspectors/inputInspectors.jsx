import React, { useCallback, useMemo, useRef, useState } from 'react';
import { bus } from '../../../js/core/event-bus.js';
import { normalizeImporterResult, serializeImportedDataset, finalizeImportedDatasets } from '../../../js/import/post-import.js';
import { showToast } from '../../../js/ui/toast.js';
import {
    InspectorLabel,
    InspectorSelect,
    MixedGeometryWarning
} from './shared.jsx';

function formatLayerCount(layer) {
    if (layer.type === 'spatial') {
        return `${layer.geojson?.features?.length || 0} features`;
    }
    return `${layer.rows?.length || 0} rows`;
}

export function LayerInputInspector({ node, config, onConfigChange, getLayers }) {
    const layers = (getLayers?.() || []).filter((l) => l.type === 'spatial' || l.type === 'table');

    const selectedLayer = config.layerId
        ? layers.find((l) => l.id === config.layerId)
        : null;
    const isMixed = selectedLayer?.schema?.geometryType === 'Mixed';

    return (
        <>
            <InspectorLabel>Source Layer</InspectorLabel>
            <InspectorSelect
                value={config.layerId || ''}
                onChange={(value) => onConfigChange({ layerId: value || null })}
            >
                <option value="">— Select a layer —</option>
                {layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                        {layer.name} ({formatLayerCount(layer)})
                    </option>
                ))}
            </InspectorSelect>
            {isMixed && <MixedGeometryWarning />}
        </>
    );
}

export function FileImportInspector({ node, config, onConfigChange, importFile }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState(null);
    const [cachedResult, setCachedResult] = useState(() => node._cachedResult);

    const hasFile = node._pendingFile || cachedResult;
    const needsReselect = config.fileName && !hasFile;
    const isMixed = cachedResult?.schema?.geometryType === 'Mixed';
    const multiLayerNote = node._multiLayerCount > 1
        ? `ZIP had ${node._multiLayerCount} layers; preview uses the first. Use main Import for all layers.`
        : null;

    const statusText = useMemo(() => {
        if (importError) {
            return `❌ ${config.fileName || 'File'}: ${importError}`;
        }
        if (importing) {
            return `⏳ Importing ${config.fileName}…`;
        }
        if (needsReselect) {
            return `⚠️ Re-select file: ${config.fileName}`;
        }
        if (cachedResult) {
            const count = cachedResult.type === 'spatial'
                ? `${cachedResult.geojson?.features?.length || 0} features`
                : `${cachedResult.rows?.length || 0} rows`;
            return `✅ ${config.fileName} (${count})`;
        }
        if (config.fileName) {
            return `⏳ ${config.fileName}`;
        }
        return 'Click or drag a file here';
    }, [config.fileName, importing, importError, needsReselect, cachedResult]);

    const handleFile = useCallback(async (file) => {
        if (!file) return;

        onConfigChange({ fileName: file.name });
        node._pendingFile = file;
        node._cachedResult = null;
        setCachedResult(null);
        setImportError(null);
        setImporting(true);

        try {
            const result = await importFile(file);
            if (!result) throw new Error('Import returned nothing');

            const { expanded } = await finalizeImportedDatasets(normalizeImporterResult(result));
            if (expanded.length === 0) throw new Error('Import returned no layers');
            if (expanded.length > 1) {
                node._multiLayerCount = expanded.length;
                showToast(
                    `ZIP contained ${expanded.length} layers; workflow preview uses the first — use main Import for all layers.`,
                    'warning'
                );
            } else {
                node._multiLayerCount = 1;
            }

            const imported = serializeImportedDataset(expanded[0]);
            node._cachedResult = imported;
            node._pendingFile = null;
            setCachedResult(imported);

            bus.emit('workflow:node-data-ready', { nodeId: node.id });
        } catch (err) {
            setImportError(err.message);
            node._cachedResult = null;
            setCachedResult(null);
        } finally {
            setImporting(false);
        }
    }, [importFile, node, onConfigChange]);

    const inputId = `wf-file-input-${node.id}`;

    return (
        <>
            <InspectorLabel>Upload File</InspectorLabel>
            <label
                className={`wf-file-drop${dragOver ? ' drag-over' : ''}`}
                htmlFor={inputId}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files.length) {
                        handleFile(e.dataTransfer.files[0]);
                    }
                }}
            >
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    {statusText}
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    id={inputId}
                    accept=".csv,.tsv,.txt,.json,.geojson,.kml,.kmz,.xlsx,.xls,.zip"
                    style={{
                        position: 'absolute',
                        width: 1,
                        height: 1,
                        overflow: 'hidden',
                        opacity: 0,
                        clip: 'rect(0,0,0,0)'
                    }}
                    onChange={() => {
                        if (inputRef.current?.files?.length) {
                            handleFile(inputRef.current.files[0]);
                        }
                    }}
                />
            </label>
            {isMixed && <MixedGeometryWarning />}
            {multiLayerNote ? (
                <p className="text-xs text-muted" style={{ marginTop: 8 }}>{multiLayerNote}</p>
            ) : null}
        </>
    );
}

export const INSPECTORS = {
    'layer-input': LayerInputInspector,
    'file-import': FileImportInspector
};

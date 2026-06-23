import { useMemo, useState } from 'react';
import { isSpatialLayer, getLayerFeatureCount } from '../../js/core/data-model.js';
import { isLayerDisplayReady, layerCrsWarning } from '../../js/crs/layer-crs.js';
import { LayerDataToolsPanel } from './LayerDataToolsPanel.jsx';
import { CollapsibleSection } from '../ui/CollapsibleSection.jsx';

export function LayerListPanel({
    layers = [],
    activeLayerId = null,
    actions
}) {
    if (!layers.length) {
        return (
            <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.5 }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                </svg>
                <p>No layers loaded. Import or drag and drop a file to start.</p>
            </div>
        );
    }

    return (
        <>
            {layers.map((layer, idx) => {
                const isActive = layer.id === activeLayerId;
                const isSpatial = isSpatialLayer(layer);
                const icon = isSpatial ? '🗺️' : '📊';
                const count = isSpatial
                    ? `${getLayerFeatureCount(layer).toLocaleString()} features`
                    : `${getLayerFeatureCount(layer).toLocaleString()} rows`;
                const fieldCount = layer.schema?.fields?.length || 0;
                const geomType = layer.schema?.geometryType;

                const outOfScale = layer._outOfScaleRange;
                const crsWarning = isSpatial && !isLayerDisplayReady(layer) ? layerCrsWarning(layer) : '';

                return (
                    <div
                        key={layer.id}
                        className={`layer-item ${isActive ? 'active' : ''}${outOfScale ? ' layer-item-scale-hidden' : ''}`}
                        data-id={layer.id}
                        onClick={() => actions.setActiveLayer(layer.id)}
                    >
                        <span className="layer-icon">{icon}</span>
                        <div className="layer-name-row">
                            <div
                                className="layer-name"
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    actions.renameLayerInline(layer.id, e.currentTarget);
                                }}
                            >
                                {layer.name}
                            </div>
                            {layer._activeFilter ? (
                                <span
                                    className="layer-filter-badge"
                                    title="Filter active – click to edit"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.openFilterBuilder(layer.id);
                                    }}
                                >
                                    FILTERED
                                </span>
                            ) : null}
                            {layer.scaleRangeEnabled ? (
                                <span
                                    className="layer-filter-badge layer-scale-badge"
                                    title={outOfScale ? 'Outside visible scale range at current zoom' : 'Scale range active'}
                                >
                                    SCALE
                                </span>
                            ) : null}
                            {crsWarning ? (
                                <span
                                    className="layer-filter-badge layer-crs-badge"
                                    title={crsWarning}
                                >
                                    CRS
                                </span>
                            ) : null}
                            <div className="layer-order-btns">
                                <button
                                    title="Move up"
                                    disabled={idx === 0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.moveLayerUp(layer.id);
                                    }}
                                >
                                    ▲
                                </button>
                                <button
                                    title="Move down"
                                    disabled={idx === layers.length - 1}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.moveLayerDown(layer.id);
                                    }}
                                >
                                    ▼
                                </button>
                            </div>
                        </div>
                        <div className="layer-bottom-row">
                            <div className="layer-meta">
                                {count} · {fieldCount} fields {geomType ? <span className="badge badge-info">{geomType}</span> : null}
                            </div>
                            <div className="layer-actions">
                                <button
                                    className="btn-icon"
                                    title="Rename"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.renameLayer(layer.id);
                                    }}
                                >
                                    ✏️
                                </button>
                                <button
                                    className="btn-icon"
                                    title="Toggle visibility"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.toggleVisibility(layer.id);
                                    }}
                                >
                                    {layer.visible ? '👁️' : '👁️‍🗨️'}
                                </button>
                                <button
                                    className="btn-icon"
                                    title="Zoom to layer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.zoomToLayer(layer.id);
                                    }}
                                >
                                    🔍
                                </button>
                                <button
                                    className="btn-icon"
                                    title="Remove"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.removeLayer(layer.id);
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
}

export function FieldListPanel({
    activeLayer = null,
    fields = [],
    actions
}) {
    const [query, setQuery] = useState('');

    const filteredFields = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return fields;
        return fields.filter((field) => {
            const name = String(field.name || '').toLowerCase();
            const outputName = String(field.outputName || '').toLowerCase();
            return name.includes(q) || outputName.includes(q);
        });
    }, [fields, query]);

    if (!activeLayer) {
        return <div className="text-muted text-sm p-8">Select a layer to view fields</div>;
    }

    return (
        <>
            <div className="input-with-btn" style={{ marginBottom: 8 }}>
                <input
                    type="search"
                    id="field-search"
                    placeholder="Search fields..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button className="btn btn-sm btn-secondary" onClick={() => actions.selectAllFields(true)}>All</button>
                <button className="btn btn-sm btn-secondary" onClick={() => actions.selectAllFields(false)}>None</button>
                <button className="btn btn-sm btn-primary" title="Add new field" onClick={() => actions.addField()}>+ Field</button>
            </div>
            <div className="field-list-items">
                {filteredFields.map((field) => (
                    <div key={field.name} className="field-item" data-field={field.name}>
                        <input
                            type="checkbox"
                            checked={!!field.selected}
                            onChange={(e) => actions.toggleField(field.name, e.target.checked)}
                        />
                        <span
                            className="field-name"
                            title="Double-click to rename"
                            onDoubleClick={(e) => actions.renameFieldInline(field.name, e.currentTarget)}
                        >
                            {field.outputName || field.name}
                        </span>
                        <span className="field-type">{field.type}</span>
                        <button
                            className="btn-icon"
                            style={{ fontSize: 10, padding: 2 }}
                            title="Rename field"
                            onClick={() => actions.renameField(field.name)}
                        >
                            ✏️
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}

export function DataPrepToolsPanel({ activeLayer = null, gisTools = null, hasLayers = false }) {
    return (
        <>
            <LayerDataToolsPanel activeLayer={activeLayer} hasLayers={hasLayers} />
            <CollapsibleSection title="GIS Tools" defaultOpen={false} expandWhen={hasLayers}>
                {gisTools}
            </CollapsibleSection>
        </>
    );
}

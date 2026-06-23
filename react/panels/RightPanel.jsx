import { isSpatialLayer } from '../../js/core/data-model.js';
import { SmartStylePanel } from './SmartStylePanel.jsx';
import { LabelsSection } from './LabelsSection.jsx';
import { VisibilityRangeSection } from './VisibilityRangeSection.jsx';
import { DataPreviewSection } from './DataPreviewSection.jsx';
import { CollapsibleSection } from '../ui/CollapsibleSection.jsx';

const TOOLBOX_EXPORT_TITLE = 'Save entire workspace as a .gis-toolbox file — all layers, map settings, pipeline, and preferences';

function ExportSection({
    layer,
    formats,
    agolMode,
    onToggleAgol,
    onExport,
    onExportProjectKit
}) {
    return (
        <CollapsibleSection title="Export" defaultOpen={false}>
            {layer ? (
                <>
                    <label className="toggle mb-8">
                        <input type="checkbox" checked={agolMode} onChange={onToggleAgol} />
                        <span className="toggle-track"></span>
                        <span>AGOL Compatible</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {formats.map((format) => (
                            <button
                                key={format.key}
                                className="btn btn-sm btn-primary"
                                onClick={() => onExport(format.key)}
                            >
                                {format.label}
                            </button>
                        ))}
                    </div>
                    <hr className="export-section-divider" />
                </>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    title={TOOLBOX_EXPORT_TITLE}
                    onClick={() => onExportProjectKit?.()}
                >
                    Toolbox Export
                </button>
            </div>
        </CollapsibleSection>
    );
}

function renderAgolIssue(issue) {
    const suffix = issue.message || issue.fixed ? ` -> ${issue.message || issue.fixed}` : '';
    return `${issue.type}: ${issue.field || ''} ${suffix}`.trim();
}

export function RightPanel({
    snapshot,
    onToggleAgol,
    onExport,
    onExportProjectKit,
    onFixAgol,
    onShowDataTable,
    onStyleChange,
    onScaleRangeChange
}) {
    const layer = snapshot?.layer || null;
    const selectedFields = snapshot?.selectedFields || [];
    const formats = snapshot?.formats || [];
    const agolMode = !!snapshot?.agolMode;
    const agolCheck = snapshot?.agolCheck || null;
    const layerStyle = snapshot?.layerStyle ?? null;
    const styleDefaultColor = snapshot?.styleDefaultColor || '#2563eb';
    const mapZoom = snapshot?.mapZoom ?? 7;
    const mapLatitude = snapshot?.mapLatitude ?? 0;

    if (!layer) {
        return (
            <div className="empty-state"><p>No layer selected</p></div>
        );
    }

    return (
        <>
            <CollapsibleSection title={`Output Schema (${selectedFields.length} fields)`} defaultOpen={false}>
                {selectedFields.map((field) => (
                    <div className="field-item" key={field.name}>
                        <span className="field-name">{field.outputName}</span>
                        <span className="field-type">{field.type}</span>
                    </div>
                ))}
                {selectedFields.length === 0 ? <div className="text-muted text-sm">No fields selected</div> : null}
            </CollapsibleSection>

            <ExportSection
                layer={layer}
                formats={formats}
                agolMode={agolMode}
                onToggleAgol={onToggleAgol}
                onExport={onExport}
                onExportProjectKit={onExportProjectKit}
            />

            {isSpatialLayer(layer) ? (
                <>
                    <SmartStylePanel
                        key={layer.id}
                        layer={layer}
                        style={layerStyle}
                        defaultColor={styleDefaultColor}
                        onStyleChange={onStyleChange}
                    />
                    <LabelsSection
                        key={`${layer.id}-labels`}
                        layer={layer}
                        style={layerStyle}
                        defaultColor={styleDefaultColor}
                        onStyleChange={onStyleChange}
                    />
                </>
            ) : null}

            {agolMode ? (
                <CollapsibleSection title="AGOL Readiness" defaultOpen={false}>
                    {agolCheck?.issues?.length
                        ? agolCheck.issues.map((issue, idx) => (
                            <div className="warning-box text-xs mb-8" key={`${issue.type}-${issue.field || idx}`}>
                                {renderAgolIssue(issue)}
                            </div>
                        ))
                        : <div className="success-box">✅ All checks passed</div>}
                    {agolCheck?.issues?.length ? (
                        <button className="btn btn-sm btn-primary w-full mt-8" onClick={onFixAgol}>
                            Fix All
                        </button>
                    ) : null}
                </CollapsibleSection>
            ) : null}

            {isSpatialLayer(layer) ? (
                <VisibilityRangeSection
                    layer={layer}
                    mapZoom={mapZoom}
                    mapLatitude={mapLatitude}
                    onChange={onScaleRangeChange}
                />
            ) : null}

            <DataPreviewSection layer={layer} onShowDataTable={onShowDataTable} />
        </>
    );
}

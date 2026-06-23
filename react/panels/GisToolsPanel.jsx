import { SelectionBar } from '../map/SelectionBar.jsx';
import { getEnabledMapGisTools } from '../../js/tools/tool-catalog.js';

const MAP_CATEGORY_LABELS = {
    coordinates: 'Coordinates',
    measurement: 'Measurement',
    transformation: 'Transformation',
    'line-ops': 'Line Operations',
    'combine-analyze': 'Combine & Analyze'
};

const MAP_CATEGORY_ORDER = ['transformation', 'combine-analyze', 'coordinates', 'measurement', 'line-ops'];

export function GisToolsPanel({
    selectionActions,
    getActiveLayer,
    getSelectionCount
}) {
    const enabled = getEnabledMapGisTools();
    const byCategory = new Map();
    for (const tool of enabled) {
        if (!byCategory.has(tool.category)) byCategory.set(tool.category, []);
        byCategory.get(tool.category).push(tool);
    }

    return (
        <>
            <SelectionBar
                getActiveLayer={getActiveLayer}
                getSelectionCount={getSelectionCount}
                onSelectAll={selectionActions?.onSelectAll}
                onInvertSelection={selectionActions?.onInvertSelection}
                onDeleteSelected={selectionActions?.onDeleteSelected}
                onClearSelection={selectionActions?.onClearSelection}
            />
            {MAP_CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((cat) => {
                const tools = byCategory.get(cat);
                return (
                    <div key={cat}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                            {MAP_CATEGORY_LABELS[cat]}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                            {tools.map((t) => (
                                <span key={t.id} className="geo-tool-btn">
                                    <button type="button" className="btn btn-sm btn-secondary" data-app-action={t.action}>
                                        {t.label}
                                    </button>
                                    <span className="geo-tip">{t.tip}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

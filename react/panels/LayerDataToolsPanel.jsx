import { WidgetPanel } from './WidgetPanel.jsx';
import { CollapsibleSection } from '../ui/CollapsibleSection.jsx';

const DATA_PREP_ACTIONS = [
    { action: 'openSplitColumn', label: 'Split Column' },
    { action: 'openCombineColumns', label: 'Combine' },
    { action: 'openTemplateBuilder', label: 'Template' },
    { action: 'openReplaceClean', label: 'Replace/Clean' },
    { action: 'openTypeConvert', label: 'Type Convert' },
    { action: 'openFilterBuilder', label: 'Filter', filterAware: true },
    { action: 'openDeduplicate', label: 'Dedup' },
    { action: 'openJoinTool', label: 'Join' },
    { action: 'openValidation', label: 'Validate' },
    { action: 'addUID', label: 'Add UID' }
];

export function LayerDataToolsPanel({ activeLayer = null, hasLayers = false }) {
    const hasFilter = !!activeLayer?._activeFilter;

    return (
        <>
            <CollapsibleSection title="Layer Data Tools" defaultOpen={false}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {DATA_PREP_ACTIONS.map((tool) => {
                        const isFilter = tool.filterAware;
                        const className = isFilter && hasFilter
                            ? 'btn btn-sm btn-primary'
                            : 'btn btn-sm btn-secondary';
                        const label = isFilter && hasFilter ? '⚙ Filter ✓' : tool.label;
                        return (
                            <button
                                key={tool.action}
                                type="button"
                                className={className}
                                data-app-action={tool.action}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="GIS Widgets" defaultOpen={false} expandWhen={hasLayers}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Pre-built workflows for common GIS tasks.
                </div>
                <WidgetPanel />
            </CollapsibleSection>
        </>
    );
}

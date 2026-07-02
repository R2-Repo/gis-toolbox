import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function UnionPolygonsDialog({
    polygonCount = 0,
    isSelection = false,
    showLargeWarning = false,
    onCancel,
    onUnion
}) {
    const statusParts = [];
    if (showLargeWarning) statusParts.push('Large dataset — this may be slow.');
    if (isSelection) statusParts.push(`Unioning ${polygonCount} selected polygons.`);

    return (
        <WidgetPanelShell
            status={statusParts.join(' ')}
            statusTone={showLargeWarning ? 'muted' : 'muted'}
            onCancel={onCancel}
            onRun={() => onUnion?.()}
            runLabel="Union"
        >
            <p className="text-xs text-muted">
                Merge {polygonCount} polygon{polygonCount === 1 ? '' : 's'} into one unified shape.
            </p>
        </WidgetPanelShell>
    );
}

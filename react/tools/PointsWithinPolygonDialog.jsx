import { useMemo, useState } from 'react';
import { LayerSelect } from '../widgets/shared/LayerSelect.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function PointsWithinPolygonDialog({
    pointLayers = [],
    polygonLayers = [],
    onCancel,
    onFind
}) {
    const firstPointLayerId = useMemo(() => (pointLayers[0]?.id || ''), [pointLayers]);
    const firstPolygonLayerId = useMemo(() => (polygonLayers[0]?.id || ''), [polygonLayers]);
    const [pointLayerId, setPointLayerId] = useState(firstPointLayerId);
    const [polygonLayerId, setPolygonLayerId] = useState(firstPolygonLayerId);

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onFind?.({ pointLayerId, polygonLayerId })}
            runLabel="Find Points"
            disabled={!pointLayerId || !polygonLayerId}
        >
            <LayerSelect
                label="Point layer"
                value={pointLayerId}
                layers={pointLayers}
                onChange={setPointLayerId}
            />
            <LayerSelect
                label="Polygon layer"
                value={polygonLayerId}
                layers={polygonLayers}
                onChange={setPolygonLayerId}
            />
        </WidgetPanelShell>
    );
}

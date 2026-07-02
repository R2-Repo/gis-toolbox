import { useMemo, useState } from 'react';
import { LayerSelect } from '../widgets/shared/LayerSelect.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function LineIntersectDialog({ layers = [], onCancel, onFind }) {
    const firstLayerId = useMemo(() => (layers[0]?.id || ''), [layers]);
    const secondLayerId = useMemo(() => (layers[1]?.id || layers[0]?.id || ''), [layers]);
    const [layerId1, setLayerId1] = useState(firstLayerId);
    const [layerId2, setLayerId2] = useState(secondLayerId);

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onFind?.({ layerId1, layerId2 })}
            runLabel="Find Intersections"
            disabled={!layerId1 || !layerId2}
        >
            <LayerSelect
                label="Line layer 1"
                value={layerId1}
                layers={layers}
                onChange={setLayerId1}
            />
            <LayerSelect
                label="Line layer 2"
                value={layerId2}
                layers={layers}
                onChange={setLayerId2}
            />
        </WidgetPanelShell>
    );
}

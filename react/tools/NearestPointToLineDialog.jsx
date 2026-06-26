import { useMemo, useState } from 'react';
import { LayerSelect } from '../widgets/shared/LayerSelect.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function NearestPointToLineDialog({
    pointLayers = [],
    lineLayers = [],
    onCancel,
    onFind
}) {
    const firstPointLayerId = useMemo(() => (pointLayers[0]?.id || ''), [pointLayers]);
    const firstLineLayerId = useMemo(() => (lineLayers[0]?.id || ''), [lineLayers]);
    const [pointLayerId, setPointLayerId] = useState(firstPointLayerId);
    const [lineLayerId, setLineLayerId] = useState(firstLineLayerId);
    const [units, setUnits] = useState('feet');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onFind?.({ pointLayerId, lineLayerId, units })}
            runLabel="Find"
            disabled={!pointLayerId || !lineLayerId}
        >
            <LayerSelect
                label="Point layer"
                value={pointLayerId}
                layers={pointLayers}
                onChange={setPointLayerId}
            />
            <LayerSelect
                label="Line layer"
                value={lineLayerId}
                layers={lineLayers}
                onChange={setLineLayerId}
            />
            <div className="form-group">
                <label>Units</label>
                <select value={units} onChange={(e) => setUnits(e.target.value)}>
                    {UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                        </option>
                    ))}
                </select>
            </div>
        </WidgetPanelShell>
    );
}

import { useMemo, useState } from 'react';
import { LayerSelect } from '../widgets/shared/LayerSelect.jsx';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function NearestPointOnLineDialog({ layers = [], onCancel, onPickPoint }) {
    const firstLayerId = useMemo(() => (layers[0]?.id || ''), [layers]);
    const [layerId, setLayerId] = useState(firstLayerId);
    const [units, setUnits] = useState('feet');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onPickPoint?.({ layerId, units })}
            runLabel="Pick Point on Map"
            disabled={!layerId}
        >
            <LayerSelect
                label="Line layer"
                value={layerId}
                layers={layers}
                onChange={setLayerId}
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

import { useState } from 'react';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function DistanceToolDialog({ onCancel, onPick }) {
    const [units, setUnits] = useState('feet');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onPick?.(units)}
            runLabel="Pick Points on Map"
        >
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

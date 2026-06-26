import { useState } from 'react';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function DestinationToolDialog({ onCancel, onPick }) {
    const [distance, setDistance] = useState('100');
    const [bearing, setBearing] = useState('0');
    const [units, setUnits] = useState('feet');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onPick?.({
                dist: parseFloat(distance),
                brng: parseFloat(bearing),
                units
            })}
            runLabel="Pick Origin on Map"
        >
            <div className="form-group">
                <label>Distance</label>
                <input
                    type="number"
                    value={distance}
                    min="0.001"
                    step="1"
                    onChange={(e) => setDistance(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Bearing (°)</label>
                <input
                    type="number"
                    value={bearing}
                    min="-180"
                    max="360"
                    step="1"
                    onChange={(e) => setBearing(e.target.value)}
                />
            </div>
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

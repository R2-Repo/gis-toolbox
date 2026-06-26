import { useState } from 'react';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function SectorDialog({ onCancel, onPickCenter }) {
    const [radius, setRadius] = useState('100');
    const [bearing1, setBearing1] = useState('0');
    const [bearing2, setBearing2] = useState('90');
    const [units, setUnits] = useState('feet');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onPickCenter?.({
                radius: parseFloat(radius),
                b1: parseFloat(bearing1),
                b2: parseFloat(bearing2),
                units
            })}
            runLabel="Pick Center on Map"
        >
            <div className="form-group">
                <label>Radius</label>
                <input
                    type="number"
                    value={radius}
                    min="0.001"
                    step="1"
                    onChange={(e) => setRadius(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Start bearing (°)</label>
                <input
                    type="number"
                    value={bearing1}
                    min="-180"
                    max="360"
                    step="1"
                    onChange={(e) => setBearing1(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>End bearing (°)</label>
                <input
                    type="number"
                    value={bearing2}
                    min="-180"
                    max="360"
                    step="1"
                    onChange={(e) => setBearing2(e.target.value)}
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

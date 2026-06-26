import { useState } from 'react';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

const UNIT_OPTIONS = ['feet', 'meters', 'miles', 'kilometers'];

export function LineSliceAlongDialog({ onCancel, onSlice }) {
    const [start, setStart] = useState('0');
    const [stop, setStop] = useState('100');
    const [units, setUnits] = useState('feet');

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onSlice?.({
                start: parseFloat(start),
                stop: parseFloat(stop),
                units
            })}
            runLabel="Slice"
        >
            <div className="form-group">
                <label>Start distance</label>
                <input
                    type="number"
                    value={start}
                    min="0"
                    step="1"
                    onChange={(e) => setStart(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Stop distance</label>
                <input
                    type="number"
                    value={stop}
                    min="0"
                    step="1"
                    onChange={(e) => setStop(e.target.value)}
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

import { useMemo, useState } from 'react';
import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

const FORMATS = [
    { id: 'dd', label: 'Decimal Degrees (DD)' },
    { id: 'dms', label: 'Degrees Minutes Seconds (DMS)' },
    { id: 'ddm', label: 'Degrees Decimal Minutes (DDM)' },
    { id: 'utm', label: 'UTM' }
];

export function CoordConverterDialog({
    isSpatial = false,
    fields = [],
    latGuess = '',
    lonGuess = '',
    onCancel,
    onConvert
}) {
    const initialSource = isSpatial ? 'geometry' : 'fields';
    const defaultLatField = useMemo(() => latGuess || fields[0] || '', [fields, latGuess]);
    const defaultLonField = useMemo(() => lonGuess || fields[1] || fields[0] || '', [fields, lonGuess]);

    const [source, setSource] = useState(initialSource);
    const [fromFormat, setFromFormat] = useState('dd');
    const [latField, setLatField] = useState(defaultLatField);
    const [lonField, setLonField] = useState(defaultLonField);
    const [toFormat, setToFormat] = useState('dms');
    const [prefix, setPrefix] = useState('');

    const canConvert = source !== 'fields' || (latField && lonField);

    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onConvert?.({
                source,
                toFormat,
                prefix,
                fromFormat,
                latField,
                lonField
            })}
            runLabel="Convert"
            disabled={!canConvert}
        >
            <div className="form-group">
                <label>Coordinate source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                    {isSpatial ? <option value="geometry">Feature geometry</option> : null}
                    <option value="fields">Attribute fields</option>
                </select>
            </div>
            {source === 'fields' ? (
                <>
                    <div className="form-group">
                        <label>Source format</label>
                        <select value={fromFormat} onChange={(e) => setFromFormat(e.target.value)}>
                            {FORMATS.filter((format) => format.id !== 'utm').map((format) => (
                                <option key={format.id} value={format.id}>{format.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Lat / Northing / Y field</label>
                        <select value={latField} onChange={(e) => setLatField(e.target.value)}>
                            {fields.map((field) => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Lon / Easting / X field</label>
                        <select value={lonField} onChange={(e) => setLonField(e.target.value)}>
                            {fields.map((field) => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                        </select>
                    </div>
                </>
            ) : null}
            <div className="form-group">
                <label>Convert to</label>
                <select value={toFormat} onChange={(e) => setToFormat(e.target.value)}>
                    {FORMATS.map((format) => (
                        <option key={format.id} value={format.id}>{format.label}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Output prefix (optional)</label>
                <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="Auto (e.g. DMS, UTM)"
                />
            </div>
        </WidgetPanelShell>
    );
}

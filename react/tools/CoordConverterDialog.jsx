import { useMemo, useState } from 'react';

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

    return (
        <div>
            <div className="form-group">
                <label>Coordinate Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                    {isSpatial ? <option value="geometry">Feature Geometry (lat/lon from shape)</option> : null}
                    <option value="fields">Attribute Fields</option>
                </select>
            </div>
            {source === 'fields' ? (
                <div>
                    <div className="form-group">
                        <label>Source Format</label>
                        <select value={fromFormat} onChange={(e) => setFromFormat(e.target.value)}>
                            {FORMATS.filter((format) => format.id !== 'utm').map((format) => (
                                <option key={format.id} value={format.id}>{format.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Latitude / Y Field</label>
                        <select value={latField} onChange={(e) => setLatField(e.target.value)}>
                            {fields.map((field) => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Longitude / X Field</label>
                        <select value={lonField} onChange={(e) => setLonField(e.target.value)}>
                            {fields.map((field) => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : null}
            <div className="form-group">
                <label>Convert To</label>
                <select value={toFormat} onChange={(e) => setToFormat(e.target.value)}>
                    {FORMATS.map((format) => (
                        <option key={format.id} value={format.id}>{format.label}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Output Field Prefix (optional)</label>
                <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="Auto (e.g. DMS, UTM)"
                />
            </div>
            <div className="info-box text-xs">
                Adds new attribute fields with the converted coordinates.<br />
                Examples: <code>DMS_lat</code>, <code>DMS_lon</code>, <code>UTM_zone</code>, <code>UTM_easting</code>, <code>UTM_northing</code>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onConvert?.({
                        source,
                        toFormat,
                        prefix,
                        fromFormat,
                        latField,
                        lonField
                    })}
                    disabled={source === 'fields' && (!latField || !lonField)}
                >
                    Convert
                </button>
            </div>
        </div>
    );
}

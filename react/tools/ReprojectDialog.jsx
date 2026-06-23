import { useState } from 'react';
import { CrsPicker } from '../widgets/shared/CrsPicker.jsx';
import { crsLabel } from '../../js/crs/registry.js';

export function ReprojectDialog({
    layerName = '',
    sourceCrs = 'EPSG:4326',
    onCancel,
    onApply
}) {
    const [fromCrs, setFromCrs] = useState(sourceCrs);
    const [toCrs, setToCrs] = useState('EPSG:4326');
    const [outputName, setOutputName] = useState('');

    return (
        <div>
            {layerName ? <p>Reproject <strong>{layerName}</strong></p> : null}
            <p className="text-muted text-sm">Creates a new layer with geometries transformed to the target coordinate system.</p>
            <CrsPicker label={`Source (${crsLabel(sourceCrs)})`} value={fromCrs} onChange={setFromCrs} />
            <CrsPicker label="Target coordinate system" value={toCrs} onChange={setToCrs} />
            <div className="form-group">
                <label>Output layer name (optional)</label>
                <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    placeholder="Auto-generated"
                />
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onApply?.({ fromCrs, toCrs, name: outputName || undefined })}
                >
                    Reproject
                </button>
            </div>
        </div>
    );
}

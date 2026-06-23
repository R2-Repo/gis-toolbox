import { useState } from 'react';
import { CrsPicker } from '../widgets/shared/CrsPicker.jsx';

export function ExportCrsDialog({
    layerName = '',
    defaultCrs = 'EPSG:4326',
    onCancel,
    onConfirm
}) {
    const [targetCrs, setTargetCrs] = useState(defaultCrs);

    return (
        <div>
            {layerName ? <p>Export <strong>{layerName}</strong></p> : null}
            <p className="text-muted text-sm">Choose the coordinate system for exported geometries and .prj file.</p>
            <CrsPicker
                label="Export coordinate system"
                value={targetCrs}
                onChange={setTargetCrs}
            />
            <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => onConfirm?.({ targetCrs })}>
                    Export
                </button>
            </div>
        </div>
    );
}

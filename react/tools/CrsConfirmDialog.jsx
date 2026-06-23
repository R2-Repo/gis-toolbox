import { useState } from 'react';
import { CrsPicker } from '../widgets/shared/CrsPicker.jsx';

export function CrsConfirmDialog({
    layerName = '',
    message = '',
    defaultCrs = 'EPSG:6337',
    onCancel,
    onConfirm
}) {
    const [crs, setCrs] = useState(defaultCrs);

    return (
        <div>
            {layerName ? <p><strong>{layerName}</strong></p> : null}
            <p className="text-muted text-sm">
                {message || 'Projected coordinates were detected. Choose the source coordinate system. Coordinates will not be reprojected automatically.'}
            </p>
            <CrsPicker
                label="Source coordinate system"
                value={crs}
                onChange={setCrs}
            />
            <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Skip</button>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onConfirm?.(crs)}
                    disabled={!crs}
                >
                    Confirm CRS
                </button>
            </div>
        </div>
    );
}

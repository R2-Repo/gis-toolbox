export function UnionPolygonsDialog({
    polygonCount = 0,
    isSelection = false,
    showLargeWarning = false,
    onCancel,
    onUnion
}) {
    return (
        <div>
            <p>Merge all {polygonCount} polygon features into a single unified polygon. Overlapping areas are dissolved.</p>
            {showLargeWarning ? (
                <div className="warning-box">Large dataset — this may be slow.</div>
            ) : null}
            {isSelection ? (
                <p className="info-box text-xs">
                    Unioning <strong>{polygonCount}</strong> selected polygons.
                </p>
            ) : null}
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button className="btn btn-primary apply-btn" onClick={() => onUnion?.()}>Union</button>
            </div>
        </div>
    );
}

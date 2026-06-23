export function LineSliceDialog({ onCancel, onPick }) {
    return (
        <div>
            <p>Click two points on the map. The section of the line between those points (snapped to nearest vertices) will be extracted.</p>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button className="btn btn-primary apply-btn" onClick={() => onPick?.()}>Pick Points on Map</button>
            </div>
        </div>
    );
}

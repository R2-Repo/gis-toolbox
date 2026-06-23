export function BearingToolDialog({ onCancel, onPick }) {
    return (
        <div>
            <p>Click two points on the map. The bearing (compass direction) from the first point to the second will be calculated.</p>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button className="btn btn-primary apply-btn" onClick={() => onPick?.()}>Pick Points on Map</button>
            </div>
        </div>
    );
}

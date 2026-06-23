export function NearestNeighborAnalysisDialog({ onCancel, onRun }) {
    return (
        <div>
            <p>Analyze the spatial distribution of points. Returns statistical metrics that indicate whether points are clustered, random, or dispersed.</p>
            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Cancel</button>
                <button className="btn btn-primary apply-btn" onClick={() => onRun?.()}>Run Analysis</button>
            </div>
        </div>
    );
}

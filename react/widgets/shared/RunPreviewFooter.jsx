export function RunPreviewFooter({
    onCancel,
    onRun,
    runLabel = 'Run',
    cancelLabel = 'Cancel',
    running = false,
    disabled = false,
    showRun = true
}) {
    return (
        <div className="modal-footer">
            <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>
                {cancelLabel}
            </button>
            {showRun ? (
                <button
                    className="btn btn-primary apply-btn"
                    onClick={() => onRun?.()}
                    disabled={disabled || running}
                >
                    {running ? 'Running...' : runLabel}
                </button>
            ) : null}
        </div>
    );
}

/**
 * Spinner + progress bar used during import after field selection.
 */
export function ImportProgressPanel({
    step = 'Starting…',
    percent = 0,
    fileName = null,
    notice = null,
    onCancel = null,
    cancelLabel = 'Cancel'
}) {
    const pct = Math.max(0, Math.min(100, Number(percent) || 0));

    return (
        <div className="import-progress-panel" style={{ textAlign: 'center', padding: '12px 8px 4px' }}>
            {notice ? (
                <div
                    className="info-box text-xs mb-8"
                    style={{ color: 'var(--warning, orange)', textAlign: 'left', lineHeight: 1.45 }}
                >
                    {notice}
                </div>
            ) : null}
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            {fileName ? (
                <div className="text-xs" style={{ marginBottom: 8, wordBreak: 'break-all' }}>{fileName}</div>
            ) : null}
            <div className="progress-step text-xs text-muted" style={{ marginBottom: 12 }}>
                {step || 'Starting…'}
            </div>
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                <div className="progress-bar-text">{Math.round(pct)}%</div>
            </div>
            {onCancel ? (
                <button
                    type="button"
                    className="btn btn-secondary btn-sm mt-8"
                    onClick={() => onCancel()}
                >
                    {cancelLabel}
                </button>
            ) : null}
        </div>
    );
}

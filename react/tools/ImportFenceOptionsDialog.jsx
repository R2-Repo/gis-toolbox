export function ImportFenceOptionsDialog({
    message,
    placeNewLabel = '⛶ Place New Fence',
    placeNewDescription = '',
    clearLabel = '🗑️ Remove Fence',
    clearDescription = '',
    onPlaceNewFence,
    onRemoveFence
}) {
    return (
        <div>
            <div className="info-box text-xs mb-8">
                {message}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-primary" style={{ padding: '10px 16px' }} onClick={() => onPlaceNewFence?.()}>
                    {placeNewLabel}
                    {placeNewDescription ? (
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{placeNewDescription}</div>
                    ) : null}
                </button>
                <button className="btn btn-secondary" style={{ padding: '10px 16px' }} onClick={() => onRemoveFence?.()}>
                    {clearLabel}
                    {clearDescription ? (
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{clearDescription}</div>
                    ) : null}
                </button>
            </div>
        </div>
    );
}
